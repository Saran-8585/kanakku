import type { LucideIcon } from 'lucide-react';
import { Home, Wallet, TrendingUp, Landmark, FileText, Settings as SettingsIcon } from 'lucide-react';

export const navItems: Array<{ path: string; label: string; icon: LucideIcon }> = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/cashflow', label: 'Cashflow', icon: Wallet },
  { path: '/invest', label: 'Invest', icon: TrendingUp },
  { path: '/debts', label: 'Debts', icon: Landmark },
  { path: '/tax', label: 'Tax', icon: FileText },
];

export const settingsItem = { path: '/settings', label: 'Settings', icon: SettingsIcon };