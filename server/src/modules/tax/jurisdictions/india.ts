import type { TaxEngine, TaxInput, TaxWorkspace } from '../types.js';

// FY 2026-27 (AY 2027-28) — new regime slabs, India
const SLABS: Array<{ upTo: number; rate: number }> = [
  { upTo: 300000, rate: 0 },
  { upTo: 700000, rate: 0.05 },
  { upTo: 1000000, rate: 0.1 },
  { upTo: 1200000, rate: 0.15 },
  { upTo: 1500000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
];

// Section caps (new regime: 80C & 80D minimal, but we track for the UI)
const DEDUCTION_CAPS: Record<string, number> = {
  '80C': 150000,
  '80D': 25000,
};

function fyStartYear(d: Date): number {
  return d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
}

function slabTax(taxable: number): number {
  let tax = 0;
  let prev = 0;
  for (const slab of SLABS) {
    if (taxable <= prev) break;
    const bracket = Math.min(taxable, slab.upTo) - prev;
    tax += bracket * slab.rate;
    prev = slab.upTo;
  }
  // section 87A rebate for taxable income <= 7L
  if (taxable <= 700000) tax = 0;
  return Math.floor(tax);
}

export const indiaEngine: TaxEngine = {
  jurisdiction: 'IN',

  fyKey(date: Date): string {
    const y = fyStartYear(date);
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  },

  compute(input: TaxInput): TaxWorkspace {
    const notes: string[] = [];

    const deductionsUsed = Object.keys(DEDUCTION_CAPS).map((section) => {
      const cap = DEDUCTION_CAPS[section];
      const used = Math.min(
        cap,
        input.deductions.filter((d) => d.section === section).reduce((s, d) => s + d.amount, 0),
      );
      return { section, cap, used, remaining: Math.max(0, cap - used) };
    });
    const totalDeductible = deductionsUsed.reduce((s, d) => s + d.used, 0);
    for (const d of deductionsUsed) {
      if (d.remaining > 0 && d.section === '80C') {
        notes.push(`Invest ${formatINR(d.remaining)} more under 80C to reach the cap.`);
      }
    }

    const grossIncome = input.grossIncome - input.exemptIncome;
    const taxableIncome = Math.max(0, grossIncome - totalDeductible);
    const incomeTax = slabTax(taxableIncome);

    // Capital gains: equity STCG 15%, LTCG 10% over 1.25L
    let stcg = 0;
    let ltcgtaxable = 0;
    for (const g of input.realizedGains) {
      if (g.gain <= 0) continue;
      if (g.holdingPeriodDays <= 365) stcg += g.gain;
      else ltcgtaxable += g.gain;
    }
    const stcgTax = Math.floor(stcg * 0.15);
    const ltcgtax = ltcgtaxable > 125000 ? Math.floor((ltcgtaxable - 125000) * 0.1) : 0;
    const gainsTax = stcgTax + ltcgtax;

    const totalTax = incomeTax + gainsTax;
    const estimatedLiability = Math.max(0, totalTax - input.tdsPaid);
    const refundOrDue = input.tdsPaid - totalTax;

    if (input.tdsPaid > 0 && totalTax > 0) {
      notes.push(
        refundOrDue >= 0 ? `Refund expected: ${formatINR(refundOrDue)}` : `Balance payable: ${formatINR(-refundOrDue)}`,
      );
    }

    return {
      grossIncome,
      taxableIncome,
      incomeTax,
      gainsTax,
      tdsPaid: input.tdsPaid,
      estimatedLiability,
      refundOrDue,
      deductionsUsed,
      gains: { stcg, ltcgtaxable, stcgTax, ltcgtax },
      regime: 'new',
      notes,
    };
  },
};

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}