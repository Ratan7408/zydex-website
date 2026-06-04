import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Phone, FileText, DollarSign, Wallet,
  KeyRound, Shield, Menu, LogOut, Moon, Sun, Bell, BookOpen, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { BrandLogo } from '../components/BrandLogo';
import SupportFab from '../components/SupportFab';

const navItems = [
  { section: 'HOME', items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }] },
  {
    section: 'VOIP MANAGEMENT',
    items: [
      { to: '/sip', icon: KeyRound, label: 'SIP & Connection' },
      { to: '/rates', icon: DollarSign, label: 'Rates' },
    ],
  },
  {
    section: 'CALLING',
    items: [
      { to: '/cdr', icon: FileText, label: 'CDR Reports' },
      { to: '/live', icon: Phone, label: 'Live Calls' },
    ],
  },
  {
    section: 'BILLING',
    items: [{ to: '/funds', icon: Wallet, label: 'Funds Management' }],
  },
  {
    section: 'KNOWLEDGE BASE',
    items: [{ to: '/tutorials', icon: BookOpen, label: 'Tutorials' }],
  },
];

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
    isActive
      ? 'bg-emerald-600 text-white shadow-sm'
      : 'text-emerald-100 hover:bg-emerald-800/50'
  }`;

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isAdmin, setUser } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(user?.balance ?? 0);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setSidebarOpen(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;
    api('/user/balance')
      .then((r) => {
        setBalance(r.balance);
        setUser((u) => (u ? { ...u, balance: r.balance } : u));
      })
      .catch(() => {});
  }, [user?.id, setUser]);

  const closeSidebar = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-emerald-50 dark:bg-zydex-bg text-emerald-950 dark:text-emerald-50">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:w-64 flex flex-col shrink-0 transition-transform duration-200 bg-emerald-950 dark:bg-zydex-bg-card border-r border-emerald-800/50 dark:border-zydex-border ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-2 py-3 border-b border-emerald-800/50 dark:border-zydex-border flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <BrandLogo to="/dashboard" size="sidebar" className="w-full" />
          </div>
          <button
            type="button"
            className="lg:hidden p-2 text-emerald-200 shrink-0"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto overscroll-contain">
          {navItems.map((group) => (
            <div key={group.section} className="mb-4">
              <p className="text-[10px] font-semibold text-emerald-500/70 uppercase tracking-wider px-3 mb-2">
                {group.section}
              </p>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass} onClick={closeSidebar}>
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
          {isAdmin && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-emerald-500/70 uppercase tracking-wider px-3 mb-2">ADMIN</p>
              <NavLink to="/admin" className={navLinkClass} onClick={closeSidebar}>
                <Shield size={18} /> Admin Panel
              </NavLink>
            </div>
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 w-full">
        <header className="min-h-14 bg-white dark:bg-zydex-bg-card border-b border-emerald-200 dark:border-zydex-border flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 shrink-0 text-emerald-950 dark:text-emerald-50">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end flex-1 min-w-0">
            <span className="bg-emerald-600 text-white px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap">
              $ {parseFloat(balance ?? user?.balance ?? 0).toFixed(2)}
            </span>
            <select className="hidden xs:block text-sm border border-emerald-200 dark:border-zydex-border rounded-lg px-2 py-1 dark:bg-emerald-950/50">
              <option>USD</option>
            </select>
            <button
              type="button"
              onClick={toggle}
              className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Bell size={18} className="text-emerald-600 dark:text-emerald-400 hidden sm:block" />
            <span className="text-sm font-semibold text-emerald-950 dark:text-emerald-50 truncate max-w-[80px] sm:max-w-none">
              {user?.username}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto zydex-page max-w-full">
          <Outlet />
        </main>
      </div>

      <SupportFab />
    </div>
  );
}
