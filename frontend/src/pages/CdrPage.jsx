import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../api/client';

function formatDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function CdrPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = () => {
    setLoading(true);
    api('/user/cdr?limit=100')
      .then((d) => setRows(d.rows || []))
      .finally(() => {
        setLoading(false);
        setLastRefresh(new Date());
      });
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Call Records</h1>
          {lastRefresh && (
            <p className="text-sm text-slate-500 mt-1">
              {lastRefresh.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-zydex-bg-card rounded-2xl border overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b">
            <tr>
              <th className="text-left p-3 font-semibold">Date &amp; Time</th>
              <th className="text-left p-3 font-semibold">Username</th>
              <th className="text-left p-3 font-semibold">Source</th>
              <th className="text-left p-3 font-semibold">Caller ID</th>
              <th className="text-left p-3 font-semibold">Called Station</th>
              <th className="text-left p-3 font-semibold">Destination</th>
              <th className="text-right p-3 font-semibold">Session Time</th>
              <th className="text-right p-3 font-semibold">Session Bill</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  Loading call records...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={r.id} className="border-t dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 whitespace-nowrap">{formatDateTime(r.dateTime)}</td>
                  <td className="p-3">{r.username}</td>
                  <td className="p-3">{r.source}</td>
                  <td className="p-3 font-mono text-xs">{r.callerId}</td>
                  <td className="p-3 font-mono text-xs">{r.calledStation}</td>
                  <td className="p-3">{r.destination}</td>
                  <td className="p-3 text-right">{r.sessionTime}</td>
                  <td className="p-3 text-right font-medium">$ {r.sessionBill.toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No call records yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
