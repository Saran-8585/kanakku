import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler, validate } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

const baseSchema = {
  accountId: z.string().min(1),
  amount: z.number().positive(),
  date: z.coerce.date(),
  note: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
};

const transactionSchema = z
  .discriminatedUnion('type', [
    z.object({
      ...baseSchema,
      type: z.literal('income'),
      categoryId: z.string().optional().nullable(),
    }),
    z.object({
      ...baseSchema,
      type: z.literal('expense'),
      categoryId: z.string().optional().nullable(),
    }),
    z.object({
      ...baseSchema,
      type: z.literal('transfer'),
      toAccountId: z.string().min(1),
      categoryId: z.string().optional().nullable(),
    }),
    z.object({
      ...baseSchema,
      type: z.literal('debt_repay'),
      categoryId: z.string().optional().nullable(),
    }),
    z.object({
      ...baseSchema,
      type: z.literal('tax_event'),
      categoryId: z.string().optional().nullable(),
    }),
  ])
  .refine((t) => t.type !== 'transfer' || t.toAccountId !== t.accountId, {
    message: 'Transfer accounts must differ',
    path: ['toAccountId'],
  });

async function assertOwnAccounts(userId: string, accountId: string, toAccountId?: string) {
  for (const id of [accountId, toAccountId].filter(Boolean) as string[]) {
    const account = await prisma.account.findFirst({ where: { id, userId } });
    if (!account) throw new ApiError(400, 'Account not found');
  }
}

function toDto<T extends { tags: string }>(t: T) {
  return { ...t, tags: JSON.parse(t.tags) };
}

transactionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const type = req.query.type as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const accountId = req.query.accountId as string | undefined;
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId!,
        ...(type ? { type: type as never } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(accountId ? { accountId } : {}),
        ...(from && to ? { date: { gte: from, lte: to } } : {}),
      },
      include: { category: true, account: { select: { name: true, id: true } } },
      orderBy: { date: 'desc' },
    });
    res.json({ transactions: transactions.map(toDto) });
  }),
);

transactionsRouter.post(
  '/',
  validate(transactionSchema),
  asyncHandler(async (req, res) => {
    await assertOwnAccounts(req.userId!, req.body.accountId, req.body.toAccountId);
    const transaction = await prisma.transaction.create({
      data: {
        userId: req.userId!,
        accountId: req.body.accountId,
        toAccountId: req.body.toAccountId,
        type: req.body.type,
        categoryId: req.body.categoryId,
        amount: req.body.amount,
        date: req.body.date,
        note: req.body.note,
        tags: JSON.stringify(req.body.tags ?? []),
      },
      include: { category: true },
    });
    res.status(201).json({ transaction: toDto(transaction) });
  }),
);

transactionsRouter.put(
  '/:id',
  validate(transactionSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) throw new ApiError(404, 'Transaction not found');
    await assertOwnAccounts(req.userId!, req.body.accountId, req.body.toAccountId);
    const transaction = await prisma.transaction.update({
      where: { id: existing.id },
      data: {
        accountId: req.body.accountId,
        toAccountId: req.body.toAccountId,
        type: req.body.type,
        categoryId: req.body.categoryId,
        amount: req.body.amount,
        date: req.body.date,
        note: req.body.note,
        tags: JSON.stringify(req.body.tags ?? []),
      },
      include: { category: true },
    });
    res.json({ transaction: toDto(transaction) });
  }),
);

transactionsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) throw new ApiError(404, 'Transaction not found');
    await prisma.transaction.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);

transactionsRouter.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) throw new ApiError(404, 'Transaction not found');
    const transaction = await prisma.transaction.create({
      data: {
        userId: existing.userId,
        accountId: existing.accountId,
        toAccountId: existing.toAccountId,
        type: existing.type,
        categoryId: existing.categoryId,
        amount: existing.amount,
        date: new Date(),
        note: existing.note,
        tags: existing.tags,
      },
    });
    res.status(201).json({ transaction: toDto(transaction) });
  }),
);