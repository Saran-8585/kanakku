import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, validate } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { listEngines } from './jurisdictions/index.js';
import { addDeduction, getWorkspace, listDeductions } from './tax.service.js';

export const taxRouter = Router();

taxRouter.use(requireAuth);

taxRouter.get(
  '/workspace',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    const fyKey = req.query.fy as string | undefined;
    const workspace = await getWorkspace(req.userId!, user.taxJurisdiction, fyKey);
    res.json({ jurisdiction: user.taxJurisdiction, fyKey: fyKey ?? null, workspace });
  }),
);

taxRouter.get('/engines', (_req, res) => {
  res.json({ engines: listEngines() });
});

taxRouter.get(
  '/deductions',
  asyncHandler(async (req, res) => {
    const fyKey = req.query.fy as string | undefined;
    const deductions = await listDeductions(req.userId!, fyKey);
    res.json({ deductions });
  }),
);

taxRouter.post(
  '/deductions',
  validate(
    z.object({
      fyKey: z.string().min(7),
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