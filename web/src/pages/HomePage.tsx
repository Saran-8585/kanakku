import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiGet, fmt, fmtPct, fmtSigned } from '../api/client';
import type { Overview } from '../api/types';

export function HomePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['overview'],
    queryFn: () => apiGet<Overview>('/dashboard/overview'),
  });

  if (isLoading) return <Centered>Loading…</Centered>;
  if (isError || !data) return <Centered>Could not load your finances.</Centered>;

  const o = data.overview;
  const currency = data.currency;

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <section className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-emerald-950/60 to-neutral-900 p-5">
        <p className="text-xs tracking-wide text-neutral-500 uppercase">Net worth</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{fmt(o.netWorth, currency)}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Metric label="Assets" value={fmt(o.assets, currency)} />
          <Metric label="Liabilities" value={fmt(o.debt, currency)} />
          <Metric label="Savings rate" value={o.savingsRate != null ? fmtPct(o.savingsRate) : '—'} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card to="/cashflow" label="Cashflow" sub={`${fmt(o.fyIncome, currency)} in · ${fmt(o.fyExpense, currency)} out`} />
        <Card to="/invest" label="Investments" sub={`${fmt(o.investments, currency)} invested`} />
        <Card to="/debts" label="Debts" sub={o.debt > 0 ? fmt(o.debt, currency) : 'Debt-free 🎉'} />
        <Card to="/tax" label="Tax" sub="Workspace & deductions" />
      </section>

      <section className="rounded-2xl border border-neutral-800 p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-400">This financial year</h2>
        <div className="grid grid-cols-2 gap-3 text-center">
          <Metric label="Income" value={fmtSigned(o.fyIncome, currency)} />
          <Metric label="Expense" value={`−${fmt(o.fyExpense, currency)}`} />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${o.fyIncome > 0 ? Math.min(100, (o.fyExpense / o.fyIncome) * 100) : 0}%` }}
          />
        </div>
      </section>

      <p className="text-center text-xs text-neutral-600">
        Tap the + button to add a transaction. Sweep left on rows to edit, right to delete.
      </p>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-900 p-3">
      <p className="text-[11px] text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Card({ to, label, sub }: { to: string; label: string; sub: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-emerald-800"
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs text-neutral-500">{sub}</p>
    </Link>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex h-64 items-center justify-center">{children}</main>;
}