import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { CashflowPage } from './pages/CashflowPage';
import { InvestPage } from './pages/InvestPage';
import { DebtsPage } from './pages/DebtsPage';
import { TaxPage } from './pages/TaxPage';
import { SettingsPage } from './pages/SettingsPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
    },
  },
});

function Boot() {
  const { user, loading, refresh } = useAuth();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-sm text-neutral-500">Loading…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          element={user ? <Layout /> : <Navigate to="/login" replace />}
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/cashflow" element={<CashflowPage />} />
          <Route path="/invest" element={<InvestPage />} />
          <Route path="/debts" element={<DebtsPage />} />
          <Route path="/tax" element={<TaxPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <Boot />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);