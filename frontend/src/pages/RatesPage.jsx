import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function RatesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/user/rates')
      .then((d) => setRows(d.rows || []))
      .finally(() => setLoading(false));
  }, []);

  const displayRows = rows.filter((r) => r.hasCustomRate).length
    ? rows.filter((r) => r.hasCustomRate)
    : rows;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 dark:text-white">Call Rates</h1>
      <p className="text-slate-500 mb-6 text-sm">
        Your custom sell rates configured by the administrator.
      </p>

      <div className="bg-white dark:bg-zydex-bg-card rounded-2xl border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b">
            <tr>
              <th className="text-left p-3 font-semibold">Prefix</th>
              <th className="text-left p-3 font-semibold">Country</th>
              <th className="text-left p-3 font-semibold">Billing</th>
              <th className="text-left p-3 font-semibold">User Custom Rate</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  Loading rates...
                </td>
              </tr>
            ) : displayRows.length ? (
              displayRows.map((r, i) => (
                <tr key={i} className="border-t dark:border-slate-800">
                  <td className="p-3 font-mono">{r.prefix}</td>
                  <td className="p-3">
                    <span className="text-emerald-700 dark:text-lime-400 font-medium">{r.country}</span>
                  </td>
                  <td className="p-3 capitalize text-slate-600">{r.billing}</td>
                  <td className="p-3 font-semibold">
                    $ {parseFloat(r.userCustomRate ?? r.rate).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  No custom rates configured yet. Contact your administrator.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
