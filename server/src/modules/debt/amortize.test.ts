import { describe, expect, it } from 'vitest';
import { amortize, computeEMI, monthsToDebtFree } from './amortize.js';

describe('computeEMI', () => {
  it('computes a standard reducing-balance EMI', () => {
    // 5,00,000 @ 9% for 60 months ≈ 10,379
    const emi = computeEMI(500000, 9, 60);
    expect(emi).toBeGreaterThan(10000);
    expect(emi).toBeLessThan(10500);
  });

  it('handles zero interest', () => {
    expect(computeEMI(120000, 0, 12)).toBe(10000);
  });
});

describe('amortize', () => {
  const loan = { principal: 2400000, interestRate: 8.5, tenureMonths: 240, startDate: new Date('2024-04-01') };

  it('fully amortizes to zero balance', () => {
    const a = amortize(loan);
    expect(a.rows.length).toBe(240);
    expect(a.rows.at(-1)!.balance).toBeLessThanOrEqual(1);
  });

  it('total repayment = principal + total interest', () => {
    const a = amortize(loan);
    const principalRepaid = a.rows.reduce((s, r) => s + r.principalPaid, 0);
    expect(Math.abs(principalRepaid - loan.principal)).toBeLessThan(2);
    expect(a.totalInterest).toBeGreaterThan(loan.principal * 0.5); // interest is sizable over 20y
  });
});

describe('monthsToDebtFree', () => {
  it('extra payments shorten tenure and save interest', () => {
    const base = monthsToDebtFree(2400000, 8.5, 20832, 0);
    const extra = monthsToDebtFree(2400000, 8.5, 20832, 5000);
    expect(extra.months).toBeLessThan(base.months);
    expect(extra.interestSaved).toBeGreaterThan(0);
  });
});