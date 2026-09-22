import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, todayInputValue } from '../api/client';
import type { Account, Loan } from '../api/types';
import { useToast } from '../components/Toast';

export function DebtsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newLoan, setNewLoan] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: loansData, isLoading, isError } = useQuery({
    queryKey: ['loans'],
    queryFn: () => apiGet<{ loans: Loan[] }>('/loans'),
  });
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiGet<{ accounts: Account[] }>('/accounts'),
  });

  const settle = useMutation({
    mutationFn: ({ cardId, bankId, amount }: { cardId: string; bankId: string; amount: number }) =>
      apiPost('/transactions', {
        type: 'transfer',
        accountId: cardId,
        toAccountId: bankId,
        amount,
        date: todayInputValue(),
        note: 'Card settlement',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Card settled');
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  const loans = loansData?.loans ?? [];
  const cards = accountsData?.accounts.filter((a) => a.type === 'card') ?? [];
  const bank = accountsData?.accounts.find((a) => a.type === 'bank');

  if (isLoading) return <main className="mx-auto max-w-3xl px-4 py-6">Loading…</main>;
  if (isError || !loansData) return <main className="mx-auto max-w-3xl px-4 py-6">Could not load debts.</main>;

  const totalDebt = loans.reduce((s, l) => s + l.outstanding, 0);

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Debts</h1>
        <button
          onClick={() => setNewLoan(true)}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-emerald-400"
        >
          + Loan
        </button>
      </div>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <p className="text-xs text-neutral-500 uppercase">Total outstanding</p>
        <p className={`mt-1 text-3xl font-bold ${totalDebt > 0 ? '' : 'text-emerald-400'}`}>
          {totalDebt > 0 ? `₹${totalDebt.toLocaleString('en-IN')}` : 'Debt-free'}
        </p>
      </section>

      <section className="space-y-3">
        {loans.map((loan) => (
          <div key={loan.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{loan.name}</p>
                <p className="text-xs text-neutral-500">
                  {loan.interestRate}% · EMI {fmtNum(loan.emi)} · {loan.tenureMonths} mo
                </p>
              </div>
              <p className="text-lg font-semibold">{fmtNum(loan.outstanding)}</p>
            </div>
            <div className="mt-3 flex gap-2 text-xs">
              <button
                onClick={() => setDetailId(detailId === loan.id ? null : loan.id)}
                className="rounded-lg bg-neutral-800 px-3 py-1.5 hover:bg-neutral-700"
              >
                {detailId === loan.id ? 'Hide schedule' : 'Amortization'}
              </button>
            </div>
            {detailId === loan.id && <LoanDetail loan={loan} />}
          </div>
        ))}
        {loans.length === 0 && (
          <p className="rounded-2xl border border-neutral-800 p-6 text-center text-sm text-neutral-500">
            No loans recorded.
          </p>
        )}
      </section>

      {cards.length > 0 && (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="mb-2 text-sm font-semibold text-neutral-400">Cards</h2>
          {cards.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-1.5 text-sm">
              <span>{c.name}</span>
              <button
                onClick={() => {
                  const amount = window.prompt(`Settle ${c.name} — amount to pay from bank:`);
                  if (!amount || Number(amount) <= 0) return;
                  if (!bank) {
                    toast('No bank account to settle against', 'error');
                    return;
                  }
                  settle.mutate({ cardId: c.id, bankId: bank.id, amount: Number(amount) });
                }}
                className="rounded bg-neutral-800 px-3 py-1 text-xs hover:bg-neutral-700"
              >
                {settle.isPending ? 'Settling…' : 'Settle'}
              </button>
            </div>
          ))}
        </section>
      )}

      {newLoan && <NewLoanModal onClose={() => setNewLoan(false)} />}
    </main>
  );

  function LoanDetail({ loan }: { loan: Loan }) {
    const { data } = useQuery({
      queryKey: ['loan', loan.id],
      queryFn: () =>
        apiGet<{
          schedule: {
            emi: number;
            totalInterest: number;
            rows: Array<{ month: number; date: string; balance: number; interestPaid: number }>;
          };
        }>(`/loans/${loan.id}/schedule`),
    });
    const [extra, setExtra] = useState('0');
    const { data: projection } = useQuery({
      queryKey: ['loan-projection', loan.id, extra],
      queryFn: () =>
        apiPost<{ projection: { months: number; interestSaved: number } }>(`/loans/${loan.id}/projection`, {
          extraPerMonth: Number(extra),
        }),
      enabled: extra !== '' && Number(extra) > 0,
    });

    return (
      <div className="mt-3 space-y-3">
        {data && (
          <>
            <p className="text-xs text-neutral-500">
              Total interest over tenure: {fmtNum(data.schedule.totalInterest)} · EMI {fmtNum(data.schedule.emi)}
            </p>
            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="pb-1 text-left">Mo</th>
                    <th className="pb-1 text-right">Date</th>
                    <th className="pb-1 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {data.schedule.rows.slice(0, 24).map((r) => (
                    <tr key={r.month}>
                      <td className="py-1">{r.month}</td>
                      <td className="py-1 text-right text-neutral-500">{r.date}</td>
                      <td className="py-1 text-right">{fmtNum(r.balance)}</td>
                    </tr>
                  ))}
                  {data.schedule.rows.length > 24 && (
                    <tr>
                      <td colSpan={3} className="py-1 text-center text-neutral-600">
                        … {data.schedule.rows.length} months total
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex-1 text-xs text-neutral-500">
                Extra payment / mo
                <input
                  type="number"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm"
                />
              </label>
              {projection && (
                <p className="text-xs text-emerald-400">
                  Debt-free in {projection.projection.months} mo (save {fmtNum(projection.projection.interestSaved)})
                </p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
}

function NewLoanModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', principal: '', interestRate: '8.5', tenureMonths: '60', startDate: '' });
  const mutation = useMutation({
    mutationFn: () =>
      apiPost('/loans', {
        name: form.name,
        principal: Number(form.principal),
        interestRate: Number(form.interestRate),
        tenureMonths: Number(form.tenureMonths),
        startDate: form.startDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast('Loan added');
      onClose();
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  const field =
    'w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-emerald-500';

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-sm space-y-3 rounded-t-2xl border border-neutral-800 bg-neutral-900 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">New loan</h2>
        <input placeholder="Name (e.g. Home Loan)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} />
        <input placeholder="Principal" type="number" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} className={field} />
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Rate % p.a." type="number" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} className={field} />
          <input placeholder="Tenure (months)" type="number" value={form.tenureMonths} onChange={(e) => setForm({ ...form, tenureMonths: e.target.value })} className={field} />
        </div>
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={field} />
        <button
          onClick={() => mutation.mutate()}
          disabled={!form.name || !form.principal || !form.startDate || mutation.isPending}
          className="w-full rounded-xl bg-emerald-500 py-2.5 font-medium text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : 'Create loan'}
        </button>
      </div>
    </div>
  );
}

function fmtNum(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}