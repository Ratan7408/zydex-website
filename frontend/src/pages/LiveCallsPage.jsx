import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { api } from '../api/client';

export default function LiveCallsPage() {
  const [calls, setCalls] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () => {
      api('/user/calls/live')
        .then((r) => setCalls(r.rows || []))
        .catch((e) => setError(e.message));
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 dark:text-white">Live Calls</h1>
      <p className="text-slate-500 mb-6 text-sm">Refreshes every 10 seconds</p>
      {error && <p className="text-amber-600 mb-4">{error}</p>}
      <div className="bg-white dark:bg-zydex-bg-card rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-left p-3">Caller</th>
              <th className="text-left p-3">Destination</th>
              <th className="text-left p-3">Duration</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  <Phone className="mx-auto mb-2 opacity-50" />
                  No active calls right now
                </td>
              </tr>
            ) : (
              calls.map((c, i) => (
                <tr key={i} className="border-t dark:border-slate-800">
                  <td className="p-3 dark:text-white">{c.sip_account || c.username || '—'}</td>
                  <td className="p-3">{c.ndiscado || c.number || '—'}</td>
                  <td className="p-3">{c.duration || c.sessiontime || '0'}s</td>
                  <td className="p-3 text-green-600">Active</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
