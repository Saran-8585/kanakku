import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { getHoldings } from '../invest/invest.service.js';
import { amortize } from '../debt/amortize.js';
import { computeCashflow, getTransactionsForUser, monthlySeries } from '../finance/finance.service.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

function fyBounds(fyStart: number, now: Date) {
  const year = now.getFullYear();
  const startMonth = fyStart - 1;
  let fyYear = year;
  if (now.getMonth() < startMonth) fyYear = year - 1;
  const start = new Date(fyYear, startMonth, 1);
  const end = new Date(fyYear + 1, startMonth, 1);
  return { start, end };
}

dashboardRouter.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    const now = new Date();

    // assets: cash accounts (opening + txns) + investments at current price
    const accounts = await prisma.account.findMany({ where: { userId: user.id } });
    const txns = await prisma.transaction.findMany({ where: { userId: user.id, type: { not: 'transfer' } } });
    const txnsByAccount = new Map<string, number>();
    for (const t of txns) {
      const b = txnsByAccount.get(t.accountId) ?? 0;
      txnsByAccount.set(t.accountId, b + (t.type === 'income' ? t.amount : -t.amount));
    }
    const cash = accounts.reduce((s, a) => {
      const flow = a.type === 'card' ? -(txnsByAccount.get(a.id) ?? 0) : txnsByAccount.get(a.id) ?? 0;
      return s + a.openingBalance + flow;
    }, 0);

    const holdings = await getHoldings(user.id);
    const investmentsValue = holdings.reduce((s, h) => s + h.value, 0);

    // liabilities: outstanding loan balances
    const loans = await prisma.loan.findMany({ where: { userId: user.id } });
    let debt = 0;
    for (const loan of loans) {
      const schedule = amortize(loan);
      const outs = schedule.rows.at(-1)?.balance ?? loan.principal;
      debt += outs;
    }

    const assets = cash + investmentsValue;
    const netWorth = assets - debt;

    // savings rate over the current FY
    const { start, end } = fyBounds(user.fyStart, now);
    const fyTxns = await getTransactionsForUser(user.id, start, end);
    const cf = computeCashflow(fyTxns);

    res.json({
      currency: user.baseCurrency,
      asOf: now.toISOString(),
      overview: {
        cash,
        investments: investmentsValue,
        assets,
        debt,
        netWorth,
        savingsRate: cf.savingsRate,
        fyIncome: cf.income,
        fyExpense: cf.expense,
      },
      accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type })),
    });
  }),
);

dashboardRouter.get(
  '/cashflow',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    const now = new Date();
    const { start, end } = fyBounds(user.fyStart, now);
    const fyTxns = await getTransactionsForUser(user.id, start, end);
    const fy = computeCashflow(fyTxns);

    const monthsAgo = Number(req.query.months ?? 6);
    const since = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
    const monthTxns = await getTransactionsForUser(user.id, since, now);
    const series = monthlySeries(monthTxns, monthsAgo);

    res.json({ fy, series });
  }),
);