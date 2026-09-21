import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/http.js';

export interface Holding {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: string;
  qty: number;
  avgCost: number;
  invested: number;
  value: number;
  unrealizedGain: number;
  unrealizedPct: number;
}

export async function buyAsset(
  userId: string,
  data: { assetId: string; qty: number; unitPrice: number; fees?: number; date?: Date },
) {
  const asset = await prisma.asset.findFirst({ where: { id: data.assetId, userId } });
  if (!asset) throw new ApiError(404, 'Asset not found');

  const date = data.date ?? new Date();
  await prisma.lot.create({
    data: {
      assetId: asset.id,
      qty: data.qty,
      unitPrice: data.unitPrice,
      fees: data.fees ?? 0,
      date,
      remainingQty: data.qty,
    },
  });
  await prisma.trade.create({
    data: {
      assetId: asset.id,
      action: 'buy',
      qty: data.qty,
      unitPrice: data.unitPrice,
      fees: data.fees ?? 0,
      date,
    },
  });
  await prisma.asset.update({ where: { id: asset.id }, data: { price: data.unitPrice, priceUpdatedAt: new Date() } });
}

export interface SellResult {
  realizedGain: number;
  holdingPeriodDays: number;
}

export async function sellAsset(
  userId: string,
  data: { assetId: string; qty: number; unitPrice: number; fees?: number; date?: Date },
): Promise<SellResult> {
  const asset = await prisma.asset.findFirst({ where: { id: data.assetId, userId } });
  if (!asset) throw new ApiError(404, 'Asset not found');

  const lots = await prisma.lot.findMany({
    where: { assetId: asset.id, remainingQty: { gt: 0 } },
    orderBy: { date: 'asc' },
  });

  let remaining = data.qty;
  let proceeds = 0;
  let cost = 0;
  const latestDate = data.date ?? new Date();
  let earliestBuy: Date | null = null;

  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(lot.remainingQty, remaining);
    proceeds += take * data.unitPrice;
    cost += take * lot.unitPrice + (data.fees ?? 0) * (take / data.qty);
    earliestBuy = earliestBuy ?? lot.date;
    await prisma.lot.update({
      where: { id: lot.id },
      data: { remainingQty: lot.remainingQty - take },
    });
    remaining -= take;
  }

  if (remaining > 0) throw new ApiError(400, 'Insufficient holdings to sell');

  const realizedGain = proceeds - cost;
  const holdingPeriodDays = earliestBuy
    ? Math.max(0, Math.floor((latestDate.getTime() - earliestBuy.getTime()) / 86400000))
    : 0;

  await prisma.trade.create({
    data: {
      assetId: asset.id,
      action: 'sell',
      qty: data.qty,
      unitPrice: data.unitPrice,
      fees: data.fees ?? 0,
      date: latestDate,
      realizedGain,
      holdingPeriodDays,
    },
  });
  await prisma.asset.update({ where: { id: asset.id }, data: { price: data.unitPrice, priceUpdatedAt: new Date() } });

  return { realizedGain, holdingPeriodDays };
}

export async function getHoldings(userId: string): Promise<Holding[]> {
  const assets = await prisma.asset.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  const holdings: Holding[] = [];
  for (const asset of assets) {
    const lots = await prisma.lot.findMany({ where: { assetId: asset.id, remainingQty: { gt: 0 } } });
    const qty = lots.reduce((s, l) => s + l.remainingQty, 0);
    if (qty <= 0) continue;
    const invested = lots.reduce((s, l) => s + l.remainingQty * l.unitPrice + l.fees * (l.remainingQty / l.qty), 0);
    const value = qty * asset.price;
    holdings.push({
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      assetClass: asset.class,
      qty,
      avgCost: invested / qty,
      invested,
      value,
      unrealizedGain: value - invested,
      unrealizedPct: invested > 0 ? ((value - invested) / invested) * 100 : 0,
    });
  }
  return holdings;
}

export function allocationByClass(holdings: Holding[]) {
  const map = new Map<string, { value: number; share: number }>();
  const total = holdings.reduce((s, h) => s + h.value, 0);
  for (const h of holdings) {
    const current = map.get(h.assetClass) ?? { value: 0, share: 0 };
    map.set(h.assetClass, { value: current.value + h.value, share: 0 });
  }
  for (const [, v] of map) v.share = total > 0 ? (v.value / total) * 100 : 0;
  return { total, breakdown: [...map.entries()].map(([assetClass, v]) => ({ assetClass, ...v })) };
}