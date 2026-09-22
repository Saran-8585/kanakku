import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Pencil, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, fmt, fmtSigned } from '../api/client';
import type { Cashflow, Transaction } from '../api/types';
import { TransactionModal } from '../components/TransactionModal';
import { useToast } from '../components/Toast';

export function CashflowPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modalState, setModalState] = useState<{ edit: Transaction | null } | null>(null);
  const [monthFilter, setMonthFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['cashflow', monthFilter],
    queryFn: () =>
      apiGet<Cashflow>(
        `/dashboard/cashflow${monthFilter ? `?months=${monthFilter}` : ''}`,
      ),
  });

  const { data: txnsData } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => apiGet<{ transactions: Transaction[] }>('/transactions'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Transaction deleted');
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  if (isLoading) return <main className="mx-auto max-w-3xl px-4 py-6">Loading…</main>;
  if (!data) return <main className="mx-auto max-w-3xl px-4 py-6">Could not load cashflow.</main>;

  const fy = data.fy;
  const transactions = txnsData?.transactions ?? [];
  const isDebit = (t: Transaction) => t.type !== 'income' && t.type !== 'transfer';

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Cashflow</h1>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm"
        >
          <option value="">This FY</option>
          {['3', '6', '12'].map((m) => (
            <option key={m} value={m}>
              Last {m} months
            </option>
          ))}
        </select>
      </div>

      <section className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Income" value={fmt(fy.income)} tone="text-emerald-400" />
        <Stat label="Expense" value={fmt(fy.expense)} tone="text-red-400" />
        <Stat label="Net" value={fmtSigned(fy.net)} tone={fy.net >= 0 ? 'text-emerald-400' : 'text-red-400'} />
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-400">Income vs expense</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="label" tick={{ fill: '#a3a3a3', fontSize: 11 }} />
              <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 8 }}
                formatter={(value) => fmt(Number(value))}
              />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {fy.byCategory.length > 0 && (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-400">Where money went</h2>
          <div className="space-y-2">
            {fy.byCategory.slice(0, 8).map((c) => {
              const share = fy.expense > 0 ? (c.amount / fy.expense) * 100 : 0;
              return (
                <div key={c.categoryId ?? c.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{c.name}</span>
                    <span className="text-neutral-500">{fmt(c.amount)} · {share.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
                    <div className="h-full rounded-full bg-neutral-500" style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-400">Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing yet — tap + to add your first transaction.</p>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {transactions.slice(0, 30).map((t) => (
              <li key={t.id} className="group flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm">{t.note || t.category?.name || t.type}</p>
                  <p className="text-xs text-neutral-500">
                    {new Date(t.date).toLocaleDateString()} · {t.account?.name ?? ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      t.type === 'income' ? 'text-emerald-400' : isDebit(t) ? 'text-neutral-200' : 'text-neutral-500'
                    }`}
                  >
                    {t.type === 'income' ? '+' : isDebit(t) ? '−' : ''}
                    {fmt(t.amount)}
                  </span>
                  <button
                    onClick={() => setModalState({ edit: t })}
                    className="rounded p-1 text-neutral-600 opacity-0 transition group-hover:opacity-100 hover:text-neutral-300"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this transaction?')) remove.mutate(t.id);
                    }}
                    className="rounded p-1 text-neutral-600 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modalState && (
        <TransactionModal edit={modalState.edit} onClose={() => setModalState(null)} />
      )}
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
      <p className="text-[11px] text-neutral-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}