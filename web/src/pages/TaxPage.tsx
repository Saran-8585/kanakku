import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, fmt, fmtSigned } from '../api/client';
import type { Deduction, TaxWorkspace } from '../api/types';
import { useToast } from '../components/Toast';

const FY = '2026-27';

export function TaxPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [section, setSection] = useState('80C');
  const [amount, setAmount] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tax', FY],
    queryFn: () => apiGet<{ workspace: TaxWorkspace }>(`/tax/workspace?fy=${FY}`),
  });
  const { data: dedData } = useQuery({
    queryKey: ['deductions', FY],
    queryFn: () => apiGet<{ deductions: Deduction[] }>(`/tax/deductions?fy=${FY}`),
  });

  const addDeduction = useMutation({
    mutationFn: () => apiPost('/tax/deductions', { fyKey: FY, section, amount: Number(amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax', FY] });
      queryClient.invalidateQueries({ queryKey: ['deductions', FY] });
      toast('Deduction added');
      setAmount('');
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  if (isLoading || !data) return <main className="mx-auto max-w-3xl px-4 py-6">Loading…</main>;

  const w = data.workspace;
  const deductions = dedData?.deductions ?? [];

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tax · FY {FY}</h1>
        <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-400">India · new regime</span>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Gross income" value={fmt(w.grossIncome)} />
        <Stat label="Taxable" value={fmt(w.taxableIncome)} />
        <Stat label="Income tax" value={fmt(w.incomeTax)} />
        <Stat label="Gains tax" value={fmt(w.gainsTax)} />
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <p className="text-xs text-neutral-500 uppercase">Estimated liability</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{fmt(w.estimatedLiability)}</p>
        <p className="mt-1 text-xs text-neutral-500">
          TDS paid {fmt(w.tdsPaid)} · {w.refundOrDue >= 0 ? `refund ${fmt(w.refundOrDue)}` : `due ${fmt(-w.refundOrDue)}`}
        </p>
        {w.notes.length > 0 && (
          <ul className="mt-3 space-y-1">
            {w.notes.map((n) => (
              <li key={n} className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                {n}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-400">Deductions</h2>
        <div className="space-y-3">
          {w.deductionsUsed.map((d) => {
            const pct = d.cap > 0 ? (d.used / d.cap) * 100 : 0;
            return (
              <div key={d.section}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>
                    Section {d.section} <span className="text-neutral-600">(cap {fmt(d.cap)})</span>
                  </span>
                  <span className={pct >= 100 ? 'text-emerald-400' : 'text-neutral-500'}>
                    {fmt(d.used)} / {fmt(d.cap)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-neutral-500'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-2 text-sm"
          >
            {['80C', '80D'].map((s) => (
              <option key={s} value={s}>
                Sec {s}
              </option>
            ))}
          </select>
          <input
            placeholder="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
          />
          <button
            onClick={() => addDeduction.mutate()}
            disabled={!amount || addDeduction.isPending}
            className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-medium text-neutral-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {addDeduction.isPending ? 'Saving…' : 'Add deduction'}
          </button>
        </div>
        {deductions.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-neutral-500">
            {deductions.map((d) => (
              <li key={d.id}>
                Sec {d.section} · {fmt(d.amount)}
                {d.note ? ` — ${d.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-400">Capital gains (realized this FY)</h2>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-neutral-500">STCG</p>
            <p className="font-medium text-red-400">{fmtSigned(w.gains.stcg)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">STCG tax (15%)</p>
            <p className="font-medium">{fmt(w.gains.stcgTax)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">LTCG taxable</p>
            <p className="font-medium text-red-400">{fmt(w.gains.ltcgtaxable)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">LTCG tax (10%)</p>
            <p className="font-medium">{fmt(w.gains.ltcgtax)}</p>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-neutral-600">
        Filing forms, TDS reconciliation and export arrive post-MVP.
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
      <p className="text-[11px] text-neutral-500">{label}</p>
      <p className="mt-0.5 text-base font-semibold">{value}</p>
    </div>
  );
}