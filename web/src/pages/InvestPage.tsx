import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { apiGet, apiPost, fmt, fmtPct } from '../api/client';
import type { Allocation, Holding } from '../api/types';
import { useToast } from '../components/Toast';

interface HoldingRow extends Holding {
  symbol: string;
}

export function InvestPage() {
  const queryClient = useQueryClient();
  const [trade, setTrade] = useState<null | { holding: HoldingRow; action: 'buy' | 'sell' }>(null);
  const [showNewAsset, setShowNewAsset] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => apiGet<{ holdings: Holding[]; allocation: Allocation }>('/assets/portfolio/holdings'),
  });

  if (isLoading || !data) return <main className="mx-auto max-w-3xl px-4 py-6">Loading…</main>;

  const { holdings, allocation } = data;

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Investments</h1>
        <button
          onClick={() => setShowNewAsset(true)}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-emerald-400"
        >
          + Asset
        </button>
      </div>

      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-3xl font-bold">{fmt(allocation.total)}</p>
          <p className="text-xs text-neutral-500">portfolio value</p>
          <div className="mt-2 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocation.breakdown.map((b) => ({ name: b.assetClass, value: Math.round(b.value) }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={3}
                >
                  {['#10b981', '#3b82f6', '#f59e0b', '#f472b6', '#a78bfa'].map((color, i) => (
                    <Cell key={i} fill={color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {allocation.breakdown.map((b) => (
              <span key={b.assetClass} className="rounded-full bg-neutral-800 px-2 py-0.5 text-neutral-400">
                {b.assetClass} {b.share.toFixed(0)}%
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-sm font-semibold text-neutral-400">Holdings</p>
          {holdings.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">No holdings yet. Add an asset, then buy.</p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-800">
              {holdings.map((h) => (
                <li key={h.assetId} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{h.symbol}</p>
                    <p className="text-xs text-neutral-500">
                      {h.qty} @ {fmt(h.avgCost)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{fmt(h.value)}</p>
                    <p className={`text-xs ${h.unrealizedGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmtPct(h.unrealizedPct)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {holdings.length > 0 && (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500">
                <th className="pb-2">Asset</th>
                <th className="pb-2 text-right">Invested</th>
                <th className="pb-2 text-right">Value</th>
                <th className="pb-2 text-right">Unrealized</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {holdings.map((h) => (
                <tr key={h.assetId}>
                  <td className="py-2.5">
                    <p className="font-medium">{h.symbol}</p>
                    <p className="text-xs text-neutral-500">{h.name}</p>
                  </td>
                  <td className="py-2.5 text-right text-neutral-400">{fmt(h.invested)}</td>
                  <td className="py-2.5 text-right">{fmt(h.value)}</td>
                  <td
                    className={`py-2.5 text-right ${h.unrealizedGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {fmt(h.unrealizedGain)} ({fmtPct(h.unrealizedPct)})
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setTrade({ holding: h, action: 'buy' })}
                        className="rounded px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => setTrade({ holding: h, action: 'sell' })}
                        className="rounded px-2 py-1 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      >
                        Sell
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {showNewAsset && <NewAssetModal onClose={() => setShowNewAsset(false)} />}
      {trade && (
        <TradeModal
          holding={trade.holding}
          action={trade.action}
          onClose={() => setTrade(null)}
          queryClient={queryClient}
        />
      )}
    </main>
  );
}

function NewAssetModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ symbol: '', name: '', assetClass: 'stock', price: '' });
  const mutation = useMutation({
    mutationFn: () =>
      apiPost('/assets', { ...form, price: Number(form.price) || 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast(`${form.symbol} added`);
      onClose();
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  return (
    <Overlay onClose={onClose}>
      <Title>New asset</Title>
      <input placeholder="Symbol (e.g. INFY)" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className={field} />
      <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} />
      <select value={form.assetClass} onChange={(e) => setForm({ ...form, assetClass: e.target.value })} className={field}>
        {['stock', 'mf', 'crypto', 'gold', 'property'].map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        placeholder="Current price (manual)"
        type="number"
        value={form.price}
        onChange={(e) => setForm({ ...form, price: e.target.value })}
        className={field}
      />
      <Submit onClick={() => mutation.mutate()} label={mutation.isPending ? 'Saving…' : 'Create asset'} />
    </Overlay>
  );
}

function TradeModal({
  holding,
  action,
  onClose,
  queryClient,
}: {
  holding: HoldingRow;
  action: 'buy' | 'sell';
  onClose: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState(holding.avgCost ? String(holding.avgCost) : '');
  const [notice, setNotice] = useState('');
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (): Promise<{ realizedGain?: number }> =>
      apiPost<{ realizedGain?: number }>(`/assets/${holding.assetId}/${action}`, {
        qty: Number(qty),
        unitPrice: Number(price),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      if (action === 'sell' && res.realizedGain != null) {
        setNotice(
          `Sold — realized ${res.realizedGain >= 0 ? 'gain' : 'loss'} of ${fmt(res.realizedGain)}. Pushed to Tax module.`,
        );
      } else {
        toast(`${action === 'buy' ? 'Bought' : 'Sold'} ${holding.symbol}`);
        onClose();
      }
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  return (
    <Overlay onClose={onClose}>
      <Title>
        {action === 'buy' ? 'Buy' : 'Sell'} {holding.symbol}
      </Title>
      <input placeholder="Quantity" type="number" value={qty} onChange={(e) => setQty(e.target.value)} className={field} />
      <input placeholder="Price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={field} />
      <Submit
        onClick={() => mutation.mutate()}
        label={mutation.isPending ? 'Saving…' : action === 'buy' ? 'Record buy' : 'Record sell'}
      />
      {mutation.isError && <p className="text-xs text-red-400">{(mutation.error as Error).message}</p>}
      {notice && (
        <div className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {notice}
          <button onClick={onClose} className="mt-2 block text-xs underline">
            Done
          </button>
        </div>
      )}
    </Overlay>
  );
}

const field =
  'w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-emerald-500';

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-sm space-y-3 rounded-t-2xl border border-neutral-800 bg-neutral-900 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

function Submit({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl bg-emerald-500 py-2.5 font-medium text-neutral-950 transition hover:bg-emerald-400"
    >
      {label}
    </button>
  );
}