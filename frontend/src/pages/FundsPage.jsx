import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, User, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function FundsPage() {
  const { user, setUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState('refills');
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  const loadFunds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`/user/funds?page=${page}&limit=${limit}`);
      setData(res);
      setUser((u) => (u ? { ...u, balance: res.balance } : u));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, setUser]);

  useEffect(() => {
    loadFunds();
  }, [loadFunds]);

  useEffect(() => {
    if (searchParams.get('status') === 'success') {
      loadFunds();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, loadFunds]);

  const handleAddBalance = async () => {
    const val = parseFloat(amount);
    if (!val || val < 10) {
      alert('Minimum deposit is $10');
      return;
    }
    setSubmitting(true);
    try {
      const result = await api('/user/funds/create', {
        method: 'POST',
        body: JSON.stringify({ amount: val }),
      });
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }
      alert(result.message || 'Payment created');
      setModalOpen(false);
      loadFunds();
    } catch (err) {
      alert(err.message || 'Could not start payment');
    } finally {
      setSubmitting(false);
    }
  };

  const balance = data?.balance ?? user?.balance ?? 0;
  const totalPages = Math.max(1, Math.ceil((data?.refillsTotal || 0) / limit));

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-50">Funds Management</h1>

      {/* Profile header */}
      <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white p-4 sm:p-5 flex flex-wrap items-center gap-4 shadow-lg">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600/30 border-2 border-emerald-400/50 flex items-center justify-center shrink-0">
          <User className="text-emerald-300" size={32} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <p className="text-sm text-zinc-400">Username</p>
          <p className="text-lg font-semibold">{data?.username || user?.username}</p>
          <p className="text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lime-400" />
            {data?.accountStatus || 'Active'}
          </p>
        </div>
        <div className="text-right sm:ml-auto">
          <p className="text-sm text-zinc-400">Current Balance</p>
          <p className="text-2xl sm:text-3xl font-bold text-lime-400">
            $ {parseFloat(balance).toFixed(2)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white font-semibold py-3.5 rounded-xl shadow-md transition-colors"
      >
        <Plus size={20} />
        Add Balance
      </button>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-zydex-border">
        <button
          type="button"
          onClick={() => setTab('refills')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            tab === 'refills'
              ? 'bg-indigo-700 text-white'
              : 'bg-slate-100 dark:bg-zydex-bg-card text-slate-600 dark:text-emerald-300'
          }`}
        >
          Successful Refills
        </button>
        <button
          type="button"
          onClick={() => setTab('requests')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            tab === 'requests'
              ? 'bg-indigo-700 text-white'
              : 'bg-slate-100 dark:bg-zydex-bg-card text-slate-600 dark:text-emerald-300'
          }`}
        >
          Deposit Requests
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-zydex-bg-card rounded-2xl border border-slate-200 dark:border-zydex-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-zydex-border">
          <h2 className="font-semibold text-emerald-950 dark:text-emerald-50">
            {tab === 'refills' ? 'Successful Refills' : 'Deposit Requests'}
          </h2>
          <button
            type="button"
            onClick={loadFunds}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zydex-border hover:bg-slate-50 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          {tab === 'refills' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-emerald-950/50 text-left text-slate-600 dark:text-emerald-300">
                  <th className="px-4 py-3 font-semibold">Refill ID</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold min-w-[200px]">Description</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : data?.refills?.length ? (
                  data.refills.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-slate-100 dark:border-zydex-border hover:bg-slate-50/50 dark:hover:bg-emerald-950/20"
                    >
                      <td className="px-4 py-3 font-medium text-emerald-950 dark:text-emerald-50">{r.id}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-lime-400">
                        $ {r.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-emerald-200 text-xs sm:text-sm">
                        {r.description}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-emerald-300 whitespace-nowrap">
                        {formatDate(r.date)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No refills yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-emerald-950/50 text-left text-slate-600 dark:text-emerald-300">
                  <th className="px-4 py-3 font-semibold">Request ID</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.pendingRequests?.length ? (
                  data.pendingRequests.map((t) => (
                    <tr
                      key={t.id}
                      className="border-t border-slate-100 dark:border-zydex-border"
                    >
                      <td className="px-4 py-3 text-xs font-mono text-emerald-950 dark:text-emerald-50">
                        {t.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 font-semibold">$ {t.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-emerald-300 whitespace-nowrap">
                        {formatDate(t.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {t.paymentUrl && (
                          <a
                            href={t.paymentUrl}
                            className="text-indigo-600 dark:text-lime-400 font-medium hover:underline text-xs"
                          >
                            Pay now
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No pending deposit requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {tab === 'refills' && data?.refillsTotal > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-3 border-t border-slate-200 dark:border-zydex-border">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded border disabled:opacity-40"
            >
              ‹
            </button>
            <span className="px-3 py-1 bg-indigo-700 text-white rounded font-medium">{page}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded border disabled:opacity-40"
            >
              ›
            </button>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="ml-2 px-2 py-1 border rounded text-sm dark:bg-emerald-950/50 dark:border-zydex-border"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Add balance modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zydex-bg-card rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-emerald-900/40"
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-emerald-950 dark:text-emerald-50 mb-1">Add Balance</h3>
            <p className="text-sm text-slate-600 dark:text-emerald-300 mb-4">
              Pay with crypto via OxaPay. Minimum deposit is <strong>$10</strong>. Balance updates automatically
              after payment.
            </p>
            <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-1">
              Amount (USD)
            </label>
            <input
              type="number"
              min={10}
              step={1}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-zydex-border rounded-lg dark:bg-emerald-950/30 dark:text-emerald-50 mb-4"
            />
            <button
              type="button"
              onClick={handleAddBalance}
              disabled={submitting}
              className="w-full bg-indigo-700 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl disabled:opacity-60"
            >
              {submitting ? 'Opening OxaPay…' : 'Continue to OxaPay'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
