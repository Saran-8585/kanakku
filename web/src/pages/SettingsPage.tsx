import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Account } from '../api/types';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiGet<{ accounts: Account[] }>('/accounts'),
  });

  const bootstrap = useMutation({
    mutationFn: () => apiPost('/categories/bootstrap'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const accounts = accountsData?.accounts ?? [];

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-400">Profile</h2>
        <p className="text-sm">
          {user?.name ?? '—'} <span className="text-neutral-500">({user?.email})</span>
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Base currency {user?.baseCurrency} · Tax jurisdiction {user?.taxJurisdiction} · FY starts month {user?.fyStart}
        </p>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-400">Accounts</h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-neutral-500">No accounts yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-800 text-sm">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <span>{a.name}</span>
                <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">{a.type}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-400">Data</h2>
        <button
          onClick={() => bootstrap.mutate()}
          className="rounded-lg bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
        >
          {bootstrap.isPending ? 'Adding…' : 'Add default categories'}
        </button>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-400">Session</h2>
        <button onClick={logout} className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20">
          Log out
        </button>
      </section>

      <p className="text-center text-xs text-neutral-600">kanakku MVP · v0.1.0</p>
    </main>
  );
}