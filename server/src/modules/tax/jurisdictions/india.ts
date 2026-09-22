import type { TaxEngine, TaxInput, TaxWorkspace } from '../types.js';

// Slab tables per financial year (new regime). A new FY = a data row, not a code change.
const FY_SLABS: Record<string, Array<{ upTo: number; rate: number }>> = {
  '2026-27': [
    { upTo: 400000, rate: 0 },
    { upTo: 800000, rate: 0.05 },
    { upTo: 1200000, rate: 0.1 },
    { upTo: 1600000, rate: 0.15 },
    { upTo: 2000000, rate: 0.2 },
    { upTo: 2400000, rate: 0.25 },
    { upTo: Infinity, rate: 0.3 },
  ],
};

// Section 87A: purely-rebatable income cap per FY (new regime).
const FY_REBATE: Record<string, number> = {
  '2026-27': 1200000,
};

// Deductions allowable under the new regime per FY. 80C is NOT deductible here.
const FY_DEDUCTION_CAPS: Record<string, Record<string, number>> = {
  '2026-27': { '80D': 25000 },
};

export const KNOWN_SECTIONS = ['80C', '80D'];

function fyStartYear(d: Date): number {
  return d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
}

function slabTax(taxable: number, slabs: Array<{ upTo: number; rate: number }>, rebateLimit: number): number {
  let tax = 0;
  let prev = 0;
  for (const slab of slabs) {
    if (taxable <= prev) break;
    const bracket = Math.min(taxable, slab.upTo) - prev;
    tax += bracket * slab.rate;
    prev = slab.upTo;
  }
  // ponytail: 87A rebate approximated as "≤ cap → zero" (no marginal relief band above 12L)
  if (taxable <= rebateLimit) tax = 0;
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

    const slabs = FY_SLABS[input.fyKey] ?? FY_SLABS['2026-27'];
    const caps = FY_DEDUCTION_CAPS[input.fyKey] ?? FY_DEDUCTION_CAPS['2026-27'];
    const rebateLimit = FY_REBATE[input.fyKey] ?? FY_REBATE['2026-27'];
    if (!FY_SLABS[input.fyKey]) {
      notes.push(`Slab table not defined for ${input.fyKey} — showing FY 2026-27 new regime.`);
    }

    const deductionsUsed = Object.keys(caps).map((section) => {
      const cap = caps[section];
      const used = Math.min(
        cap,
        input.deductions.filter((d) => d.section === section).reduce((s, d) => s + d.amount, 0),
      );
      return { section, cap, used, remaining: Math.max(0, cap - used) };
    });
    const totalDeductible = deductionsUsed.reduce((s, d) => s + d.used, 0);

    // exemptIncome was already excluded from grossIncome upstream — never subtract it again.
    const grossIncome = input.grossIncome;
    const taxableIncome = Math.max(0, grossIncome - totalDeductible);
    const incomeTax = slabTax(taxableIncome, slabs, rebateLimit);

    // Capital gains: equity STCG 15%, LTCG 10% over 1.25L.
    // ponytail: all classes taxed as equity; crypto (30%) / gold & MF (12.5%) are wrong.
    // Upgrade: per-asset-class gain tax in the engine once asset class reaches TaxInput.
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