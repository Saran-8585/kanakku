import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler, validate } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { assertNoTransactions } from '../../lib/refs.js';

export const accountsRouter = Router();

accountsRouter.use(requireAuth);

const accountSchema = z.object({
  type: z.enum(['bank', 'wallet', 'card', 'invest']),
  name: z.string().min(1),
  openingBalance: z.number().default(0),
  currency: z.string().length(3).default('INR'),
});

accountsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const accounts = await prisma.account.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { transactions: true } } },
    });
    res.json({ accounts });
  }),
);

accountsRouter.post(
  '/',
  validate(accountSchema),
  asyncHandler(async (req, res) => {
    const account = await prisma.account.create({
      data: { userId: req.userId!, ...req.body },
    });
    res.status(201).json({ account });
  }),
);

accountsRouter.put(
  '/:id',
  validate(accountSchema.partial()),
  asyncHandler(async (req, res) => {
    const account = await prisma.account.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!account) throw new ApiError(404, 'Account not found');
    const updated = await prisma.account.update({
      where: { id: account.id },
      data: req.body,
    });
    res.json({ account: updated });
  }),
);

accountsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const account = await prisma.account.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!account) throw new ApiError(404, 'Account not found');
    await assertNoTransactions(req.userId!, { OR: [{ accountId: account.id }, { toAccountId: account.id }] });
    await prisma.account.delete({ where: { id: account.id } });
    res.status(204).end();
  }),
);