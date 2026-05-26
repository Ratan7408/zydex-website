const API_BASE = import.meta.env.VITE_API_URL || '/portal/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('zydex_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = data.error || data.message || 'Request failed';
    if (Array.isArray(msg)) msg = msg.map((e) => e.message || e).join('. ');
    if (typeof msg === 'object') msg = JSON.stringify(msg);
    throw new Error(msg);
  }
  return data;
}
