import type { Loan } from '@prisma/client';

export interface AmortRow {
  month: number;
  date: string;
  principalPaid: number;
  interestPaid: number;
  balance: number;
  totalPaid: number;
}

export interface Amortization {
  emi: number;
  totalInterest: number;
  totalRepayment: number;
  rows: AmortRow[];
}

export function computeEMI(principal: number, annualRatePercent: number, tenureMonths: number): number {
  if (tenureMonths <= 0) return 0;
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return Math.round(principal / tenureMonths);
  const factor = Math.pow(1 + r, tenureMonths);
  return Math.round((principal * r * factor) / (factor - 1));
}

export function amortize(loan: Pick<Loan, 'principal' | 'interestRate' | 'tenureMonths' | 'startDate'>): Amortization {
  const emi = computeEMI(loan.principal, loan.interestRate, loan.tenureMonths);
  const r = loan.interestRate / 100 / 12;
  let balance = loan.principal;
  let totalInterest = 0;

  const rows: AmortRow[] = [];
  for (let month = 1; month <= loan.tenureMonths && balance > 0; month++) {
    const interest = balance * r;
    const principalPart = Math.min(emi - interest, balance);
    balance = Math.max(0, balance - principalPart);
    totalInterest += interest;

    const d = new Date(loan.startDate);
    d.setMonth(d.getMonth() + month);
    rows.push({
      month,
      date: d.toISOString().slice(0, 10),
      principalPaid: Math.round(principalPart * 100) / 100,
      interestPaid: Math.round(interest * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      totalPaid: Math.round(principalPart * month + totalInterest * 100) / 100,
    });
  }

  return {
    emi,
    totalInterest,
    totalRepayment: loan.principal + totalInterest,
    rows,
  };
}

export function monthsToDebtFree(
  principal: number,
  annualRatePercent: number,
  emi: number,
  extraPerMonth: number,
): { months: number; interestSaved: number } {
  const r = annualRatePercent / 100 / 12;
  let balance = principal;
  let baseInterest = 0;
  const baseMonth = Math.ceil(-Math.log(1 - (principal * r) / emi) / Math.log(1 + r)) || 0;

  for (let i = 0; i < baseMonth; i++) {
    if (balance <= 0) break;
    const interest = balance * r;
    const principalPart = Math.min(emi - interest, balance);
    balance -= principalPart;
    baseInterest += interest;
  }

  balance = principal;
  let totalInterest = 0;
  let months = 0;
  const payment = emi + extraPerMonth;
  while (balance > 0 && months < 1200) {
    const interest = balance * r;
    const principalPart = Math.min(payment - interest, balance);
    balance -= principalPart;
    totalInterest += interest;
    months++;
    if (balance <= 0) break;
  }

  return { months, interestSaved: Math.max(0, baseInterest - totalInterest) };
}