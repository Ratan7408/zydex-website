import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { api } from '../api/client';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [liveCalls, setLiveCalls] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [signupPlans, setSignupPlans] = useState([]);
  const [magnusPlans, setMagnusPlans] = useState([]);
  const [newPlan, setNewPlan] = useState({ magnusPlanId: '', name: '', description: '', benefits: '' });
  const [rateMarkups, setRateMarkups] = useState([]);
  const [rateForm, setRateForm] = useState({
    prefix: '1',
    label: 'USA CLI',
    buyRate: '0.01',
    sellRate: '0.05',
  });
  const [rateSaving, setRateSaving] = useState(false);
  const [tab, setTab] = useState('overview');

  const reload = () => {
    Promise.all([
      api('/admin/dashboard'),
      api('/admin/analytics'),
      api('/admin/users'),
      api('/admin/transactions'),
      api('/admin/calls/live'),
      api('/admin/fraud-alerts'),
    ]).then(([s, a, u, t, c, f]) => {
      setStats(s);
      setAnalytics(a);
      setUsers(u.rows || []);
      setTransactions(t.rows || []);
      setLiveCalls(c.rows || []);
      setFraudAlerts(f.rows || []);
    });
  };

  useEffect(() => {
    reload();
    loadPlans();
    loadRateMarkups();
    const id = setInterval(() => api('/admin/calls/live').then((c) => setLiveCalls(c.rows || [])), 15000);
    return () => clearInterval(id);
  }, []);

  const blockUser = async (id) => {
    await api(`/admin/users/${id}/block`, { method: 'POST' });
    reload();
  };

  const unblockUser = async (id) => {
    await api(`/admin/users/${id}/unblock`, { method: 'POST' });
    reload();
  };

  const confirmTx = async (id) => {
    await api(`/admin/transactions/${id}/confirm`, { method: 'POST' });
    reload();
  };

  const chartData = {
    labels: ['Revenue', 'Calls', 'Minutes'],
    datasets: [
      {
        label: 'Last 30 days',
        data: [
          analytics?.revenue30d || 0,
          analytics?.calls30d || 0,
          analytics?.minutes30d || 0,
        ],
        backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa'],
      },
    ],
  };

  const loadPlans = () => {
    Promise.all([api('/admin/plans'), api('/admin/plans/magnus')]).then(([p, m]) => {
      setSignupPlans(p.rows || []);
      setMagnusPlans(m.rows || []);
    });
  };

  const loadRateMarkups = () => {
    api('/admin/rates/markups').then((r) => setRateMarkups(r.rows || []));
  };

  const addPlan = async (e) => {
    e.preventDefault();
    const benefits = newPlan.benefits
      ? JSON.stringify(
          newPlan.benefits
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        )
      : null;
    await api('/admin/plans', {
      method: 'POST',
      body: JSON.stringify({ ...newPlan, benefits }),
    });
    setNewPlan({ magnusPlanId: '', name: '', description: '', benefits: '' });
    loadPlans();
  };

  const togglePlan = async (id, active) => {
    await api(`/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify({ active: !active }) });
    loadPlans();
  };

  const saveRateMarkup = async (e) => {
    e.preventDefault();
    setRateSaving(true);
    try {
      await api('/admin/rates/markups', { method: 'POST', body: JSON.stringify(rateForm) });
      setRateForm({ prefix: '1', label: 'USA CLI', buyRate: '0.01', sellRate: '0.05' });
      loadRateMarkups();
    } finally {
      setRateSaving(false);
    }
  };

  const updateRateMarkup = async (id, data) => {
    await api(`/admin/rates/markups/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    loadRateMarkups();
  };

  const deleteRateMarkup = async (id) => {
    await api(`/admin/rates/markups/${id}`, { method: 'DELETE' });
    loadRateMarkups();
  };

  const tabs = ['overview', 'rates', 'plans', 'users', 'transactions', 'live', 'fraud'];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Admin Panel</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: stats?.totalUsers },
          { label: 'Revenue', value: `$${(stats?.totalRevenue || 0).toFixed(2)}` },
          { label: 'Live Calls', value: stats?.liveCalls },
          { label: 'Fraud Alerts', value: stats?.activeAlerts },
        ].map((c) => (
          <div key={c.label} className="bg-white dark:bg-zydex-bg-card rounded-xl border p-4">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="text-2xl font-bold dark:text-white">{c.value ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm capitalize ${
              tab === t ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 dark:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zydex-bg-card rounded-xl border p-4">
            <h2 className="font-semibold mb-4 dark:text-white">30-Day Analytics</h2>
            <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </div>
          <div className="bg-white dark:bg-zydex-bg-card rounded-xl border p-4">
            <h2 className="font-semibold mb-4 dark:text-white">Summary</h2>
            <ul className="space-y-2 text-sm dark:text-slate-300">
              <li>Deposits (30d): {analytics?.deposits30d ?? 0}</li>
              <li>Call volume (30d): {analytics?.calls30d ?? 0}</li>
              <li>Minutes (30d): {analytics?.minutes30d ?? 0}</li>
              <li>Call cost (30d): ${(analytics?.callCost30d || 0).toFixed(2)}</li>
            </ul>
          </div>
        </div>
      )}

      {tab === 'rates' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zydex-bg-card rounded-xl border p-4">
            <h2 className="font-semibold mb-2 dark:text-white">USA CLI sell rate</h2>
            <p className="text-sm text-slate-500 mb-4">
              Set the rate you sell USA CLI at. Users see this under Rates → User Custom Rate (prefix <code>1</code> = USA).
            </p>
            <form onSubmit={saveRateMarkup} className="grid md:grid-cols-5 gap-3">
              <input
                placeholder="Prefix (e.g. 1)"
                value={rateForm.prefix}
                onChange={(e) => setRateForm({ ...rateForm, prefix: e.target.value })}
                className="border rounded-lg px-3 py-2 dark:bg-slate-800"
                required
              />
              <input
                placeholder="Label (USA CLI)"
                value={rateForm.label}
                onChange={(e) => setRateForm({ ...rateForm, label: e.target.value })}
                className="border rounded-lg px-3 py-2 dark:bg-slate-800"
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Your cost / min"
                value={rateForm.buyRate}
                onChange={(e) => setRateForm({ ...rateForm, buyRate: e.target.value })}
                className="border rounded-lg px-3 py-2 dark:bg-slate-800"
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Sell rate / min"
                value={rateForm.sellRate}
                onChange={(e) => setRateForm({ ...rateForm, sellRate: e.target.value })}
                className="border rounded-lg px-3 py-2 dark:bg-slate-800"
                required
              />
              <button
                type="submit"
                disabled={rateSaving}
                className="bg-emerald-600 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
              >
                {rateSaving ? 'Saving...' : 'Add / Update Rate'}
              </button>
            </form>
          </div>
          <div className="bg-white dark:bg-zydex-bg-card rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="p-3 text-left">Prefix</th>
                  <th className="p-3 text-left">Label</th>
                  <th className="p-3 text-left">Buy / min</th>
                  <th className="p-3 text-left">Sell / min</th>
                  <th className="p-3 text-left">Margin %</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rateMarkups.map((m) => (
                  <tr key={m.id} className="border-t dark:border-slate-800">
                    <td className="p-3 font-mono dark:text-white">{String(m.prefix).replace(/^\+/, '')}</td>
                    <td className="p-3">{m.label || '—'}</td>
                    <td className="p-3">${parseFloat(m.buyRate).toFixed(4)}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.0001"
                        defaultValue={parseFloat(m.sellRate)}
                        onBlur={(e) =>
                          updateRateMarkup(m.id, { sellRate: parseFloat(e.target.value) })
                        }
                        className="w-24 border rounded px-2 py-1 dark:bg-slate-800"
                      />
                    </td>
                    <td className="p-3">{parseFloat(m.marginPct).toFixed(1)}%</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => deleteRateMarkup(m.id)}
                        className="text-red-600 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {rateMarkups.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No sell rates yet. Add USA CLI rate above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zydex-bg-card rounded-xl border p-4">
            <h2 className="font-semibold mb-4 dark:text-white">Add signup plan</h2>
            <p className="text-sm text-slate-500 mb-4">
              Plans shown on registration and dashboard. Link each to a Magnus plan ID. Add one benefit per line.
            </p>
            <form onSubmit={addPlan} className="grid md:grid-cols-2 gap-3">
              <select
                value={newPlan.magnusPlanId}
                onChange={(e) => {
                  const mp = magnusPlans.find((p) => String(p.id) === e.target.value);
                  setNewPlan({
                    ...newPlan,
                    magnusPlanId: e.target.value,
                    name: mp?.name || newPlan.name,
                  });
                }}
                className="border rounded-lg px-3 py-2 dark:bg-slate-800"
                required
              >
                <option value="">Magnus plan ID</option>
                {magnusPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Display name on signup"
                value={newPlan.name}
                onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                className="border rounded-lg px-3 py-2 dark:bg-slate-800"
                required
              />
              <input
                placeholder="Short description (optional)"
                value={newPlan.description}
                onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                className="border rounded-lg px-3 py-2 dark:bg-slate-800"
              />
              <textarea
                placeholder="Benefits (one per line)"
                value={newPlan.benefits}
                onChange={(e) => setNewPlan({ ...newPlan, benefits: e.target.value })}
                className="border rounded-lg px-3 py-2 dark:bg-slate-800 md:col-span-2 min-h-[88px]"
              />
              <button type="submit" className="bg-emerald-600 text-white rounded-lg px-4 py-2 font-semibold md:col-span-2">
                Add Plan
              </button>
            </form>
          </div>
          <div className="bg-white dark:bg-zydex-bg-card rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Magnus ID</th>
                  <th className="p-3 text-left">Benefits</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {signupPlans.map((p) => {
                  let benefitLines = [];
                  try {
                    benefitLines = p.benefits ? JSON.parse(p.benefits) : [];
                  } catch {
                    benefitLines = [];
                  }
                  return (
                  <tr key={p.id} className="border-t dark:border-slate-800">
                    <td className="p-3 dark:text-white">{p.name}</td>
                    <td className="p-3">{p.magnusPlanId}</td>
                    <td className="p-3 text-xs text-slate-500 max-w-xs">
                      {benefitLines.length ? benefitLines.join(' · ') : '—'}
                    </td>
                    <td className="p-3">{p.active ? 'Active' : 'Hidden'}</td>
                    <td className="p-3">
                      <button
                        onClick={() => togglePlan(p.id, p.active)}
                        className="text-emerald-600 text-xs font-semibold"
                      >
                        {p.active ? 'Hide' : 'Show'}
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white dark:bg-zydex-bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Balance</th>
                <th className="text-left p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t dark:border-slate-800">
                  <td className="p-3 dark:text-white">{u.username}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">${parseFloat(u.wallet?.balance || 0).toFixed(2)}</td>
                  <td className="p-3">
                    {u.role === 'ADMIN' ? (
                      <span className="text-slate-400 text-xs">—</span>
                    ) : !u.isBlocked ? (
                      <button onClick={() => blockUser(u.id)} className="text-red-600 text-xs font-semibold">
                        Block
                      </button>
                    ) : (
                      <button onClick={() => unblockUser(u.id)} className="text-green-600 text-xs font-semibold">
                        Unblock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="bg-white dark:bg-zydex-bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-t dark:border-slate-800">
                  <td className="p-3 dark:text-white">{t.user?.username}</td>
                  <td className="p-3">${parseFloat(t.amount).toFixed(2)}</td>
                  <td className="p-3">{t.status}</td>
                  <td className="p-3">
                    {t.status === 'PENDING' && (
                      <button onClick={() => confirmTx(t.id)} className="text-emerald-600 text-xs font-semibold">
                        Confirm
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'live' && (
        <div className="bg-white dark:bg-zydex-bg-card rounded-xl border p-4">
          {liveCalls.length === 0 ? (
            <p className="text-slate-500">No active calls</p>
          ) : (
            liveCalls.map((c, i) => (
              <div key={i} className="flex justify-between py-2 border-b dark:border-slate-800 text-sm">
                <span>{c.sip_account || c.username}</span>
                <span>{c.ndiscado || c.number}</span>
                <span className="text-green-600">Live</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'fraud' && (
        <div className="space-y-2">
          {fraudAlerts.map((a) => (
            <div key={a.id} className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm">
              <p className="font-semibold dark:text-white">{a.username}</p>
              <p className="text-slate-600 dark:text-slate-400">{a.reason}</p>
              <p className="text-xs mt-1 text-slate-500">
                {a.severity} · {a.autoBlocked ? 'Auto-blocked' : 'Alert only'} · {new Date(a.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {fraudAlerts.length === 0 && <p className="text-slate-500">No fraud alerts</p>}
        </div>
      )}
    </div>
  );
}
