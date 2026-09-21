export interface User {
  id: string;
  email: string;
  name: string | null;
  baseCurrency: string;
  taxJurisdiction: string;
  fyStart: number;
}

export interface Account {
  id: string;
  type: 'bank' | 'wallet' | 'card' | 'invest';
  name: string;
  openingBalance: number;
  currency: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  isCustom: boolean;
}

export type TxType = 'income' | 'expense' | 'transfer' | 'debt_repay' | 'tax_event';

export interface Transaction {
  id: string;
  accountId: string;
  toAccountId?: string | null;
  type: TxType;
  categoryId?: string | null;
  amount: number;
  date: string;
  note?: string | null;
  tags: string[];
  category?: { id: string; name: string; type: string } | null;
  account?: { id: string; name: string } | null;
}

export interface Overview {
  currency: string;
  asOf: string;
  overview: {
    cash: number;
    investments: number;
    assets: number;
    debt: number;
    netWorth: number;
    savingsRate: number | null;
    fyIncome: number;
    fyExpense: number;
  };
}

export interface CashflowSeries {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface Cashflow {
  fy: {
    income: number;
    expense: number;
    net: number;
    savingsRate: number | null;
    byCategory: Array<{ categoryId: string | null; name: string; amount: number }>;
  };
  series: CashflowSeries[];
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  price: number;
  priceUpdatedAt?: string | null;
}

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

export interface Allocation {
  total: number;
  breakdown: Array<{ assetClass: string; value: number; share: number }>;
}

export interface Loan {
  id: string;
  name: string;
  principal: number;
  interestRate: number;
  startDate: string;
  tenureMonths: number;
  emi: number;
  outstanding: number;
  totalRemaining: number;
  interestPaidToDate: number;
}

export interface Deduction {
  id: string;
  fyKey: string;
  section: string;
  amount: number;
  note?: string | null;
}

export interface TaxWorkspace {
  grossIncome: number;
  taxableIncome: number;
  incomeTax: number;
  gainsTax: number;
  tdsPaid: number;
  estimatedLiability: number;
  refundOrDue: number;
  deductionsUsed: Array<{ section: string; cap: number; used: number; remaining: number }>;
  gains: { stcg: number; ltcgtaxable: number; stcgTax: number; ltcgtax: number };
  regime: string;
  notes: string[];
}