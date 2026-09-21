export interface TaxInput {
  grossIncome: number;
  exemptIncome: number;
  deductions: Array<{ section: string; amount: number }>;
  tdsPaid: number;
  realizedGains: Array<{ gain: number; holdingPeriodDays: number }>;
  fyKey: string;
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

export interface TaxEngine {
  jurisdiction: string;
  fyKey: (date: Date) => string;
  compute: (input: TaxInput) => TaxWorkspace;
}