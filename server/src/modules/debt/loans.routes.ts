import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler, validate } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { amortize, computeEMI, monthsSinceStart, monthsToDebtFree, snapshot } from './amortize.js';

export const loansRouter = Router();

loansRouter.use(requireAuth);

const loanSchema = z.object({
  name: z.string().min(1),
  principal: z.number().positive(),
  interestRate: z.number().nonnegative(),
  startDate: z.coerce.date(),
  tenureMonths: z.number().int().positive(),
});

function summary(loan: { principal: number; interestRate: number; tenureMonths: number; startDate: Date }, now: Date) {
  const a = amortize(loan);
  const snap = snapshot(a.rows, monthsSinceStart(loan.startDate, now));
  const outstanding = snap?.outstanding ?? loan.principal;
  const futureInterest = snap
    ? a.rows.slice(snap.monthsElapsed).reduce((s, r) => s + r.interestPaid, 0)
    : 0;
  return {
    emi: a.emi,
    outstanding: Math.round(outstanding),
    totalRemaining: Math.round(outstanding + futureInterest),
    interestPaidToDate: Math.round(snap?.interestPaid ?? 0),
  };
}

loansRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const loans = await prisma.loan.findMany({ where: { userId: req.userId! }, orderBy: { startDate: 'asc' } });
    res.json({
      loans: loans.map((l) => ({ ...l, ...summary(l, now) })),
    });
  }),
);

loansRouter.post(
  '/',
  validate(loanSchema),
  asyncHandler(async (req, res) => {
    const emi = computeEMI(req.body.principal, req.body.interestRate, req.body.tenureMonths);
    const loan = await prisma.loan.create({
      data: { userId: req.userId!, ...req.body, emi },
    });
    res.status(201).json({ loan });
  }),
);

loansRouter.get(
  '/:id/schedule',
  asyncHandler(async (req, res) => {
    const loan = await prisma.loan.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!loan) throw new ApiError(404, 'Loan not found');
    res.json({ loan, schedule: amortize(loan) });
  }),
);

loansRouter.post(
  '/:id/projection',
  validate(z.object({ extraPerMonth: z.number().nonnegative() })),
  asyncHandler(async (req, res) => {
    const loan = await prisma.loan.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!loan) throw new ApiError(404, 'Loan not found');
    const emi = loan.emi ?? computeEMI(loan.principal, loan.interestRate, loan.tenureMonths);
    const a = amortize(loan);
    const snap = snapshot(a.rows, monthsSinceStart(loan.startDate, new Date()));
    const outstanding = snap?.outstanding ?? loan.principal;
    const projection = monthsToDebtFree(outstanding, loan.interestRate, emi, req.body.extraPerMonth);
    if (!Number.isFinite(projection.months)) {
      throw new ApiError(400, 'Extra payment below monthly interest — loan never gets paid down');
    }
    res.json({ projection });
  }),
);

loansRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const loan = await prisma.loan.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!loan) throw new ApiError(404, 'Loan not found');
    await prisma.loan.delete({ where: { id: loan.id } });
    res.status(204).end();
  }),
);