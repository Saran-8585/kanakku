import { describe, expect, it } from 'vitest';
import { indiaEngine } from './jurisdictions/india.js';

const base = {
  grossIncome: 0,
  exemptIncome: 0,
  deductions: [],
  tdsPaid: 0,
  realizedGains: [],
  fyKey: '2026-27',
};

describe('indiaEngine FY 2026-27 (new regime)', () => {
  it('87A rebate zeroes tax on income at/below 12L', () => {
    const ws = indiaEngine.compute({ ...base, grossIncome: 800000 });
    expect(ws.incomeTax).toBe(0);
    expect(ws.estimatedLiability).toBe(0);
  });

  it('applies the new-regime slabs above 12L', () => {
    // 1.4M: 4L@0 + 4L@5%(20k) + 4L@10%(40k) + 2L@15%(30k) = 90k
    const ws = indiaEngine.compute({ ...base, grossIncome: 1400000 });
    expect(ws.incomeTax).toBe(90000);
  });

  it('ignores 80C under the new regime', () => {
    const ws = indiaEngine.compute({ ...base, grossIncome: 1400000, deductions: [{ section: '80C', amount: 150000 }] });
    expect(ws.taxableIncome).toBe(1400000); // 80C not deductible
    expect(ws.deductionsUsed.map((d) => d.section)).not.toContain('80C');
    expect(ws.deductionsUsed.map((d) => d.section)).toContain('80D');
  });

  it('still applies 80D under the new regime', () => {
    const ws = indiaEngine.compute({ ...base, grossIncome: 1400000, deductions: [{ section: '80D', amount: 25000 }] });
    // 1.375M: 4L@0 + 4L@5%(20k) + 4L@10%(40k) + 1.75L@15%(26.25k) = 86.25k
    expect(ws.taxableIncome).toBe(1375000);
    expect(ws.incomeTax).toBe(86250);
  });

  it('does not subtract exempt income a second time (upstream already excluded it)', () => {
    const ws = indiaEngine.compute({ ...base, grossIncome: 500000, exemptIncome: 100000 });
    expect(ws.taxableIncome).toBe(500000);
  });

  it('separates STCG and LTCG on equity', () => {
    const ws = indiaEngine.compute({
      ...base,
      realizedGains: [
        { gain: 400000, holdingPeriodDays: 180 }, // STCG
        { gain: 300000, holdingPeriodDays: 500 }, // LTCG → 175k taxable
      ],
    });
    expect(ws.gains.stcg).toBe(400000);
    expect(ws.gains.stcgTax).toBe(60000);
    expect(ws.gains.ltcgtaxable).toBe(300000);
    expect(ws.gains.ltcgtax).toBe(17500);
  });

  it('offsets TDS and reports refund', () => {
    const ws = indiaEngine.compute({ ...base, grossIncome: 2000000, tdsPaid: 300000 });
    expect(ws.refundOrDue).toBe(300000 - ws.incomeTax);
  });
});