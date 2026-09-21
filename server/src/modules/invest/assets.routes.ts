import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler, validate } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { buyAsset, getHoldings, sellAsset, allocationByClass } from './invest.service.js';

export const assetsRouter = Router();

assetsRouter.use(requireAuth);

const assetSchema = z.object({
  symbol: z.string().min(1).max(12),
  name: z.string().min(1),
  assetClass: z.enum(['stock', 'mf', 'crypto', 'gold', 'property']),
  price: z.number().nonnegative().default(0),
});

const tradeBody = z.object({
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  fees: z.number().nonnegative().default(0),
  date: z.coerce.date().optional(),
});

assetsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const assets = await prisma.asset.findMany({ where: { userId: req.userId! }, orderBy: { name: 'asc' } });
    res.json({ assets });
  }),
);

assetsRouter.post(
  '/',
  validate(assetSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.asset.findFirst({
      where: { userId: req.userId!, symbol: req.body.symbol },
    });
    if (existing) throw new ApiError(409, 'Asset with that symbol already exists');
    const asset = await prisma.asset.create({
      data: { userId: req.userId!, ...req.body, priceUpdatedAt: new Date() },
    });
    res.status(201).json({ asset });
  }),
);

assetsRouter.put(
  '/:id/price',
  validate(z.object({ price: z.number().nonnegative() })),
  asyncHandler(async (req, res) => {
    const asset = await prisma.asset.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!asset) throw new ApiError(404, 'Asset not found');
    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data: { price: req.body.price, priceUpdatedAt: new Date() },
    });
    res.json({ asset: updated });
  }),
);

assetsRouter.post(
  '/:id/buy',
  validate(tradeBody),
  asyncHandler(async (req, res) => {
    await buyAsset(req.userId!, { assetId: req.params.id, ...req.body });
    res.status(201).json({ ok: true });
  }),
);

assetsRouter.post(
  '/:id/sell',
  validate(tradeBody),
  asyncHandler(async (req, res) => {
    const result = await sellAsset(req.userId!, { assetId: req.params.id, ...req.body });
    res.json({ ok: true, ...result });
  }),
);

assetsRouter.get(
  '/:id/lots',
  asyncHandler(async (req, res) => {
    const asset = await prisma.asset.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!asset) throw new ApiError(404, 'Asset not found');
    const lots = await prisma.lot.findMany({ where: { assetId: asset.id }, orderBy: { date: 'asc' } });
    const trades = await prisma.trade.findMany({ where: { assetId: asset.id }, orderBy: { date: 'asc' } });
    res.json({ lots, trades });
  }),
);

assetsRouter.get(
  '/portfolio/holdings',
  asyncHandler(async (req, res) => {
    const holdings = await getHoldings(req.userId!);
    const alloc = allocationByClass(holdings);
    res.json({ holdings, allocation: alloc });
  }),
);