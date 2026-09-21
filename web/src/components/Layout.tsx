import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { navItems, settingsItem } from './nav';
import { TransactionModal } from './TransactionModal';

export function Layout() {
  const [modalOpen, setModalOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-24">
      <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight">kanakku</span>
            <span className="text-xs text-neutral-500">personal finance</span>
          </div>
          <NavLink
            to={settingsItem.path}
            className={({ isActive }) =>
              `text-sm ${isActive ? 'text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'}`
            }
          >
            {settingsItem.label}
          </NavLink>
        </div>
      </header>

      <Outlet />

      {location.pathname !== '/settings' && (
        <button
          onClick={() => setModalOpen(true)}
          aria-label="Quick add"
          className="fixed right-4 bottom-24 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
        >
          <Plus size={26} />
        </button>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                  isActive ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {modalOpen && <TransactionModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}