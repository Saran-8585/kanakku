import { prisma } from '../../lib/prisma.js';

export async function getTransactionsForUser(userId: string, from?: Date, to?: Date) {
  const where = {
    userId,
    type: { not: 'transfer' as const },
    ...(from && to ? { date: { gte: from, lte: to } } : {}),
  };
  return prisma.transaction.findMany({
    where,
    include: { category: { select: { name: true, id: true, type: true } } },
    orderBy: { date: 'asc' },
  });
}

export interface CashflowBucket {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
}

export interface CashflowSummary {
  income: number;
  expense: number;
  net: number;
  savingsRate: number | null;
  byCategory: Array<{ categoryId: string | null; name: string; amount: number }>;
  daily: Array<{ date: string; income: number; expense: number }>;
}

export function computeCashflow(
  transactions: Array<{
    amount: number;
    date: Date;
    type: string;
    categoryId: string | null;
    category?: { name: string } | null;
  }>,
): CashflowSummary {
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();

  for (const t of transactions) {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') {
      expense += t.amount;
      const key = t.categoryId ?? 'uncategorized';
      byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
    }
  }

  const categoryBreakdown = [...byCategory.entries()]
    .map(([categoryId, amount]) => ({
      categoryId: categoryId === 'uncategorized' ? null : categoryId,
      name: transactions.find((t) => t.categoryId === categoryId)?.category?.name ?? 'Uncategorized',
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    income,
    expense,
    net: income - expense,
    savingsRate: income > 0 ? ((income - expense) / income) * 100 : null,
    byCategory: categoryBreakdown,
    daily: [],
  };
}

export function monthlySeries(
  transactions: Array<{ amount: number; date: Date; type: string }>,
  months = 6,
): CashflowBucket[] {
  const buckets = new Map<string, CashflowBucket>();
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    buckets.set(key, { key, label: monthLabel(key), income: 0, expense: 0, net: 0 });
  }
  for (const t of transactions) {
    const key = monthKey(t.date);
    if (!buckets.has(key)) continue;
    const b = buckets.get(key)!;
    if (t.type === 'income') b.income += t.amount;
    else if (t.type === 'expense') b.expense += t.amount;
  }
  for (const b of buckets.values()) b.net = b.income - b.expense;
  return [...buckets.values()];
}