import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler, validate } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { amortize, computeEMI, monthsToDebtFree } from './amortize.js';

export const loansRouter = Router();

loansRouter.use(requireAuth);

const loanSchema = z.object({
  name: z.string().min(1),
  principal: z.number().positive(),
  interestRate: z.number().nonnegative(),
  startDate: z.coerce.date(),
  tenureMonths: z.number().int().positive(),
});

function summary(loan: { principal: number; interestRate: number; tenureMonths: number; startDate: Date }) {
  const emi = computeEMI(loan.principal, loan.interestRate, loan.tenureMonths);
  const schedule = amortize(loan);
  const outstanding = schedule.rows.at(-1)?.balance ?? loan.principal;
  return {
    emi,
    outstanding: Math.round(outstanding),
    totalRemaining: Math.round(outstanding + (loan.tenureMonths - schedule.rows.length) * emi),
  };
}

loansRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const loans = await prisma.loan.findMany({ where: { userId: req.userId! }, orderBy: { startDate: 'asc' } });
    res.json({
      loans: loans.map((l) => {
        const s = summary(l);
        return {
          ...l,
          emi: s.emi,
          outstanding: s.outstanding,
          totalRemaining: s.totalRemaining,
          interestPaidToDate: Math.round(
            amortize(l).rows.reduce((a, r) => a + r.interestPaid, 0),
          ),
        };
      }),
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
    const projection = monthsToDebtFree(loan.principal, loan.interestRate, emi, req.body.extraPerMonth);
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