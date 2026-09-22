import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, todayInputValue } from '../api/client';
import type { Account, Category, Transaction, TxType } from '../api/types';
import { useToast } from './Toast';

interface Props {
  onClose: () => void;
  edit?: Transaction | null;
}

const TYPE_LABELS: Record<TxType, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
  debt_repay: 'Loan / Card payment',
  tax_event: 'Tax paid',
};

export function TransactionModal({ onClose, edit }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [type, setType] = useState<TxType>(edit?.type ?? 'expense');
  const [accountId, setAccountId] = useState(edit?.accountId ?? '');
  const [toAccountId, setToAccountId] = useState(edit?.toAccountId ?? '');
  const [categoryId, setCategoryId] = useState(edit?.categoryId ?? '');
  const [amount, setAmount] = useState(String(edit?.amount ?? ''));
  const [date, setDate] = useState((edit?.date ?? todayInputValue()).slice(0, 10));
  const [note, setNote] = useState(edit?.note ?? '');

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiGet<{ accounts: Account[] }>('/accounts'),
  });
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiGet<{ categories: Category[] }>('/categories'),
  });

  const accounts = accountsData?.accounts ?? [];
  const categories = categoriesData?.categories ?? [];

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        type,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        categoryId: type === 'expense' || type === 'income' ? categoryId || null : null,
        amount: Number(amount),
        date,
        note: note || null,
      };
      return edit
        ? apiPut(`/transactions/${edit.id}`, body)
        : apiPost('/transactions', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast(edit ? 'Transaction updated' : 'Transaction saved');
      onClose();
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl border border-neutral-800 bg-neutral-900 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{edit ? 'Edit transaction' : 'Add transaction'}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300">
            ✕
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {(Object.keys(TYPE_LABELS) as TxType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setCategoryId('');
              }}
              className={`rounded-full px-3 py-1 text-xs ${
                type === t ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={fieldClass}
            />
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
          </Field>

          <Field label="Account">
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={fieldClass}>
              <option value="">Select…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>

          {type === 'transfer' ? (
            <Field label="To account">
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={fieldClass}>
                <option value="">Select…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === accountId}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Category">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={fieldClass}
                disabled={type !== 'expense' && type !== 'income'}
              >
                <option value="">None</option>
                {categories
                  .filter((c) => (type === 'income' ? c.type === 'income' : c.type === 'expense'))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}

          <Field label="Note" full>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              className={fieldClass}
            />
          </Field>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={!amount || Number(amount) <= 0 || !accountId || mutation.isPending}
          className="mt-5 w-full rounded-xl bg-emerald-500 py-2.5 font-medium text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : 'Save transaction'}
        </button>
        {mutation.isError && <p className="mt-2 text-xs text-red-400">{(mutation.error as Error).message}</p>}
      </div>
    </div>
  );
}

const fieldClass =
  'w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-emerald-500';

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? 'col-span-2' : ''}`}>
      <span className="mb-1 block text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}