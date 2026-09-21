import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler, validate } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
});

const BUILTIN: Array<{ name: string; type: 'income' | 'expense' }> = [
  { name: 'Salary', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Dividends', type: 'income' },
  { name: 'Interest', type: 'income' },
  { name: 'Gifts', type: 'income' },
  { name: 'Food', type: 'expense' },
  { name: 'Rent', type: 'expense' },
  { name: 'Groceries', type: 'expense' },
  { name: 'Utilities', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Subscriptions', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: 'Healthcare', type: 'expense' },
  { name: 'Travel', type: 'expense' },
  { name: 'Entertainment', type: 'expense' },
  { name: 'Other', type: 'expense' },
];

categoriesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userCategories = await prisma.category.findMany({
      where: { userId: req.userId! },
      orderBy: { name: 'asc' },
    });
    res.json({ categories: userCategories });
  }),
);

categoriesRouter.post(
  '/bootstrap',
  asyncHandler(async (req, res) => {
    await prisma.$transaction(
      BUILTIN.map((c) =>
        prisma.category.upsert({
          where: { userId_name: { userId: req.userId!, name: c.name } },
          update: {},
          create: { userId: req.userId!, name: c.name, type: c.type, isCustom: false },
        }),
      ),
    );
    res.status(204).end();
  }),
);

categoriesRouter.post(
  '/',
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId: req.userId!, name: req.body.name } },
    });
    if (existing) throw new ApiError(409, 'Category already exists');
    const category = await prisma.category.create({
      data: { userId: req.userId!, ...req.body, isCustom: true },
    });
    res.status(201).json({ category });
  }),
);

categoriesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!category) throw new ApiError(404, 'Category not found');
    await prisma.category.delete({ where: { id: category.id } });
    res.status(204).end();
  }),
);