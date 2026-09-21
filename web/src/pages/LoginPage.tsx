import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name || undefined);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold tracking-tight">kanakku</div>
          <p className="mt-1 text-sm text-neutral-500">Your financial control center</p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          {mode === 'register' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className={field}
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={field}
          />
          <input
            type="password"
            required
            minLength={mode === 'register' ? 8 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={field}
          />

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-emerald-500 py-2.5 font-medium text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="w-full text-center text-xs text-neutral-500 hover:text-neutral-300"
          >
            {mode === 'login' ? 'Need an account? Register' : 'Already registered? Log in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-neutral-600">
          Demo: demo@kanakku.app / demo1234
        </p>
      </div>
    </div>
  );
}

const field =
  'w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm outline-none focus:border-emerald-500';