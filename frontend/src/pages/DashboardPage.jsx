import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Shield, Phone, Banknote, Gift, KeyRound } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, setUser } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api('/user/dashboard')
      .then((d) => {
        setData(d);
        setUser((u) => (u ? { ...u, balance: d.balance } : u));
      })
      .catch(console.error);
  }, [setUser]);

  const balance = parseFloat(data?.balance ?? user?.balance ?? 0);

  const cards = [
    { key: 'balance', label: 'Account Balance', icon: Wallet, color: 'from-lime-500 to-lime-600', value: `$${balance.toFixed(2)}` },
    { key: 'accountStatus', label: 'Status', icon: Shield, color: 'from-emerald-500 to-emerald-600', value: data?.accountStatus || 'Active' },
    { key: 'totalCalls', label: 'Total Calls', icon: Phone, color: 'from-emerald-600 to-emerald-700', value: data?.totalCalls ?? 0 },
    { key: 'totalDeposits', label: 'Deposits', icon: Banknote, color: 'from-emerald-700 to-emerald-800', value: data?.totalDeposits ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 text-emerald-950 dark:text-emerald-50">Welcome, {user?.username}!</h1>
      {data?.planName && (
        <p className="text-emerald-700 dark:text-emerald-300 mb-4">
          Plan: <span className="font-medium text-emerald-900 dark:text-emerald-100">{data.planName}</span>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.key} className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 text-white shadow-lg`}>
            <card.icon className="mb-3 opacity-90" size={28} />
            <p className="text-sm opacity-90">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Link
          to="/sip"
          className="flex items-center gap-4 p-5 bg-white dark:bg-zydex-bg-card border border-emerald-200 dark:border-zydex-border rounded-2xl hover:border-lime-400 transition-colors shadow-sm text-emerald-950 dark:text-emerald-50"
        >
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center shrink-0">
            <KeyRound className="text-emerald-700 dark:text-lime-400" size={24} />
          </div>
          <div>
            <p className="font-semibold text-emerald-950 dark:text-emerald-50">SIP & Connection</p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">Server IP, IP-to-IP, Caller ID</p>
          </div>
        </Link>
        <Link
          to="/funds"
          className="flex items-center gap-4 p-5 bg-white dark:bg-zydex-bg-card border border-emerald-200 dark:border-zydex-border rounded-2xl hover:border-lime-400 transition-colors shadow-sm text-emerald-950 dark:text-emerald-50"
        >
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center shrink-0">
            <Wallet className="text-emerald-700 dark:text-lime-400" size={24} />
          </div>
          <div>
            <p className="font-semibold text-emerald-950 dark:text-emerald-50">Add Funds</p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">Top up your balance</p>
          </div>
        </Link>
      </div>

      <div className="bg-white dark:bg-zydex-bg-card rounded-2xl border border-emerald-200 dark:border-zydex-border p-6 text-emerald-950 dark:text-emerald-50">
        <h2 className="text-lg font-semibold mb-4 text-emerald-950 dark:text-emerald-50">Announcements</h2>
        {data?.announcements?.length ? (
          data.announcements.map((a) => (
            <div key={a.id} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mb-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Gift className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="font-semibold dark:text-white">{a.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{a.message}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-emerald-700 dark:text-emerald-300">No announcements at this time.</p>
        )}
      </div>
    </div>
  );
}
