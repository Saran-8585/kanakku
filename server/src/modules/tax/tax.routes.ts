import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler, validate } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { listEngines } from './jurisdictions/index.js';
import { addDeduction, fyKeyFromDate, getWorkspace, listDeductions } from './tax.service.js';

export const taxRouter = Router();

taxRouter.use(requireAuth);

const FY_RE = /^\d{4}-\d{2}$/;

function parseFy(value: string | undefined): { fyKey?: string; error?: ApiError } {
  if (value === undefined) return {};
  if (!FY_RE.test(value) || Number(value.slice(0, 4)) < 2000 || Number(value.slice(0, 4)) > 2100) {
    return { error: new ApiError(400, 'fy must look like 2026-27') };
  }
  return { fyKey: value };
}

taxRouter.get(
  '/workspace',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    const fy = parseFy(req.query.fy as string | undefined);
    if (fy.error) throw fy.error;
    const resolvedFy = fy.fyKey ?? fyKeyFromDate(user.fyStart, new Date());
    const workspace = await getWorkspace(req.userId!, user.taxJurisdiction, resolvedFy);
    res.json({ jurisdiction: user.taxJurisdiction, fyKey: resolvedFy, workspace });
  }),
);

taxRouter.get('/engines', (_req, res) => {
  res.json({ engines: listEngines() });
});

taxRouter.get(
  '/deductions',
  asyncHandler(async (req, res) => {
    const fy = parseFy(req.query.fy as string | undefined);
    if (fy.error) throw fy.error;
    const deductions = await listDeductions(req.userId!, fy.fyKey);
    res.json({ deductions });
  }),
);

taxRouter.post(
  '/deductions',
  validate(
    z.object({
      fyKey: z.string().regex(FY_RE, 'fyKey must look like 2026-27'),
      section: z.string().min(1),
      amount: z.number().positive(),
      note: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const deduction = await addDeduction(req.userId!, req.body);
    res.status(201).json({ deduction });
  }),
);

taxRouter.delete(
  '/deductions/:id',
  asyncHandler(async (req, res) => {
    await prisma.deduction.deleteMany({ where: { id: req.params.id, userId: req.userId! } });
    res.status(204).end();
  }),
);