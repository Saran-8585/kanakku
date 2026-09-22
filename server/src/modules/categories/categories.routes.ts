import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler, validate } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { assertNoTransactions } from '../../lib/refs.js';
import { BUILTIN_CATEGORIES } from './builtin.js';

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
});

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
      BUILTIN_CATEGORIES.map((c) =>
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
    await assertNoTransactions(req.userId!, { categoryId: category.id });
    await prisma.category.delete({ where: { id: category.id } });
    res.status(204).end();
  }),
);