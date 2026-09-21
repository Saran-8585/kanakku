import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/http.js';
import { getEngine } from './jurisdictions/index.js';
import type { TaxInput, TaxWorkspace } from './types.js';

// Income categories treated as exempt/excluded from taxable income (e.g., gifts, dividends up to limits)
const EXEMPT_CATEGORY_NAMES = new Set(['Gifts']);

export function fyKeyFromDate(fyStart: number, date: Date): string {
  const year = date.getFullYear();
  const startMonth = fyStart - 1;
  let fyYear = year;
  if (date.getMonth() < startMonth) fyYear = year - 1;
  return `${fyYear}-${String((fyYear + 1) % 100).padStart(2, '0')}`;
}

export async function getWorkspace(userId: string, jurisdiction: string, fyKey?: string): Promise<TaxWorkspace> {
  const engine = getEngine(jurisdiction);
  if (!engine) throw new ApiError(400, `Tax engine not available for jurisdiction "${jurisdiction}"`);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const now = new Date();
  const resolvedFy = fyKey ?? fyKeyFromDate(user.fyStart, now);

  // financial-year bounds
  const startMonth = (user.fyStart - 1 + 12) % 12;
  const [fyYear] = resolvedFy.split('-').map(Number);
  const fyStart = new Date(fyYear, startMonth, 1);
  const fyEnd = new Date(fyYear + 1, startMonth, 1);

  const txns = await prisma.transaction.findMany({
    where: { userId, date: { gte: fyStart, lt: fyEnd }, type: { not: 'transfer' } },
    include: { category: true },
  });

  const incomeCat = new Map<string, string>();
  for (const c of await prisma.category.findMany({ where: { userId } })) incomeCat.set(c.id, c.name);

  let grossIncome = 0;
  let exemptIncome = 0;
  let tdsPaid = 0;
  for (const t of txns) {
    if (t.type === 'income') {
      const name = t.categoryId ? incomeCat.get(t.categoryId) : null;
      if (name && EXEMPT_CATEGORY_NAMES.has(name)) exemptIncome += t.amount;
      else grossIncome += t.amount;
    } else if (t.type === 'tax_event' && t.amount > 0) {
      tdsPaid += t.amount;
    }
  }

  const deductions = await prisma.deduction.findMany({ where: { userId, fyKey: resolvedFy } });
  const trades = await prisma.trade.findMany({
    where: {
      asset: { userId },
      action: 'sell',
      realizedGain: { not: null },
      date: { gte: fyStart, lt: fyEnd },
    },
  });

  const input: TaxInput = {
    grossIncome,
    exemptIncome,
    deductions: deductions.map((d) => ({ section: d.section, amount: d.amount })),
    tdsPaid,
    realizedGains: trades.map((t) => ({ gain: t.realizedGain ?? 0, holdingPeriodDays: t.holdingPeriodDays ?? 0 })),
    fyKey: resolvedFy,
  };

  return engine.compute(input);
}

export async function addDeduction(
  userId: string,
  data: { fyKey: string; section: string; amount: number; note?: string },
) {
  return prisma.deduction.create({ data: { userId, ...data } });
}

export async function listDeductions(userId: string, fyKey?: string) {
  return prisma.deduction.findMany({
    where: {
      userId,
      ...(fyKey ? { fyKey } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}