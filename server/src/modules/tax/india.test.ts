import { describe, expect, it } from 'vitest';
import { indiaEngine } from './jurisdictions/india.js';

describe('indiaEngine', () => {
  it('applies 87A rebate below 7L taxable', () => {
    const ws = indiaEngine.compute({
      grossIncome: 650000,
      exemptIncome: 0,
      deductions: [],
      tdsPaid: 0,
      realizedGains: [],
      fyKey: '2026-27',
    });
    expect(ws.incomeTax).toBe(0);
    expect(ws.estimatedLiability).toBe(0);
  });

  it('applies slab tax + section 80C reduction', () => {
    const ws = indiaEngine.compute({
      grossIncome: 1200000,
      exemptIncome: 0,
      deductions: [{ section: '80C', amount: 150000 }],
      tdsPaid: 0,
      realizedGains: [],
      fyKey: '2026-27',
    });
    expect(ws.taxableIncome).toBe(1050000);
    expect(ws.incomeTax).toBeGreaterThan(0);
    expect(ws.deductionsUsed.find((d) => d.section === '80C')?.remaining).toBe(0);
  });

  it('separates STCG and LTCG on equity', () => {
    const ws = indiaEngine.compute({
      grossIncome: 0,
      exemptIncome: 0,
      deductions: [],
      tdsPaid: 0,
      realizedGains: [
        { gain: 400000, holdingPeriodDays: 180 }, // STCG
        { gain: 300000, holdingPeriodDays: 500 }, // LTCG → 175k taxable
      ],
      fyKey: '2026-27',
    });
    expect(ws.gains.stcg).toBe(400000);
    expect(ws.gains.stcgTax).toBe(60000);
    expect(ws.gains.ltcgtaxable).toBe(300000);
    expect(ws.gains.ltcgtax).toBe(17500);
  });

  it('offsets TDS and reports refund', () => {
    const ws = indiaEngine.compute({
      grossIncome: 1200000,
      exemptIncome: 0,
      deductions: [],
      tdsPaid: 150000,
      realizedGains: [],
      fyKey: '2026-27',
    });
    expect(ws.tdsPaid).toBe(150000);
    expect(ws.refundOrDue).toBe(150000 - ws.incomeTax);
  });
});