import { useEffect, useState } from 'react';
import { Copy, Check, Server, Wifi, Phone, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';

export default function SipPage() {
  const [sip, setSip] = useState(null);
  const [copied, setCopied] = useState('');
  const [authType, setAuthType] = useState('dynamic');
  const [clientIp, setClientIp] = useState('');
  const [password, setPassword] = useState('');
  const [callerId, setCallerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingCallerId, setSavingCallerId] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(true);

  const load = () =>
    api('/user/sip').then((data) => {
      setSip(data);
      setAuthType(data.authType || 'dynamic');
      setClientIp(data.clientIp || '');
      setCallerId(data.callerId && data.callerId !== 'Not set' ? data.callerId : '');
    });

  useEffect(() => {
    load();
  }, []);

  const copy = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  const saveConnection = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api('/user/sip/settings', {
        method: 'POST',
        body: JSON.stringify({
          authType,
          clientIp: authType === 'ip' ? clientIp : undefined,
          password: authType === 'dynamic' && password ? password : undefined,
        }),
      });
      setSip(updated);
      setAuthType(updated.authType);
      setClientIp(updated.clientIp || '');
      setPassword('');
      setSuccess(updated.message || 'Settings saved in Magnus');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveCallerId = async () => {
    setSavingCallerId(true);
    setError('');
    try {
      const updated = await api('/user/sip/callerid', {
        method: 'POST',
        body: JSON.stringify({ callerId }),
      });
      setSip(updated);
      setSuccess('Caller ID updated');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCallerId(false);
    }
  };

  if (!sip) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-500">Loading your SIP settings...</p>
      </div>
    );
  }

  const isIp = sip.authType === 'ip';
  const serverIp = sip.voipUrl || sip.server;

  const CopyBtn = ({ value, field }) => (
    <button
      type="button"
      onClick={() => copy(value, field)}
      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
      title="Copy"
    >
      {copied === field ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
    </button>
  );

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2 dark:text-white">SIP Credentials</h1>
      <p className="text-slate-500 mb-6">
        Edit your SIP settings: standard registration (username + password) or IP-to-IP (your IP in Magnus host, no password).
      </p>

      {error && <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-xl text-sm border border-red-100">{error}</div>}
      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-800 rounded-xl text-sm border border-green-100">{success}</div>
      )}

      {/* Server IP — always visible */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white mb-6 shadow-lg">
        <div className="flex items-center gap-2 mb-2 opacity-90">
          <Server size={20} />
          <span className="text-sm font-medium">Your VoIP Server IP</span>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-3xl font-bold tracking-wide">{serverIp}</p>
          <CopyBtn value={serverIp} field="server" />
        </div>
        <p className="text-sm mt-3 opacity-80">
          Point your softphone or PBX to this IP. Username: <strong>{sip.username}</strong>
        </p>
      </div>

      {/* Connection type — always visible */}
      <div className="bg-white dark:bg-zydex-bg-card rounded-2xl border p-6 mb-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-1 dark:text-white">Connection type</h2>
        <p className="text-sm text-slate-500 mb-4">Choose how you authenticate to our server</p>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={() => setAuthType('dynamic')}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              authType === 'dynamic'
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <Wifi className={`mb-2 ${authType === 'dynamic' ? 'text-emerald-600' : 'text-slate-400'}`} size={28} />
            <p className="font-semibold dark:text-white">Standard (dynamic)</p>
            <p className="text-xs text-slate-500 mt-1">Use SIP username + password in Zoiper, Linphone, etc.</p>
          </button>

          <button
            type="button"
            onClick={() => setAuthType('ip')}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              authType === 'ip'
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <Server className={`mb-2 ${authType === 'ip' ? 'text-emerald-600' : 'text-slate-400'}`} size={28} />
            <p className="font-semibold dark:text-white">IP-to-IP</p>
            <p className="text-xs text-slate-500 mt-1">No SIP password — your IP is whitelisted in Magnus</p>
          </button>
        </div>

        {authType === 'ip' ? (
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">SIP Username</label>
              <div className="flex gap-2 mt-1">
                <code className="flex-1 p-3 bg-white dark:bg-zydex-bg-card rounded-xl border dark:border-slate-600">
                  {sip.username}
                </code>
                <CopyBtn value={sip.username} field="user-ip" />
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-medium dark:text-white">Your public IP (Magnus host) *</span>
              <p className="text-xs text-slate-500 mb-2">
                This IP is saved in your SIP user host field. SIP password is cleared for IP-to-IP.
              </p>
              <input
                type="text"
                value={clientIp}
                onChange={(e) => setClientIp(e.target.value)}
                placeholder="e.g. 203.0.113.50"
                className="w-full px-4 py-3 border rounded-xl dark:bg-zydex-bg-card dark:border-slate-600 text-lg"
              />
            </label>
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
              Save to update Magnus: host = your IP, secret removed, permit = your IP/32. Caller ID is not available in
              IP-to-IP mode.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">SIP Username</label>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">{sip.username}</code>
                  <CopyBtn value={sip.username} field="user" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">SIP Password</label>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-sm break-all">
                    {sip.secret ? (showPassword ? sip.secret : '••••••••') : '—'}
                  </code>
                  {sip.secret && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <CopyBtn value={sip.secret} field="pass" />
                    </>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium dark:text-white">Change SIP password (optional)</label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty to keep current password"
                className="w-full mt-1 px-4 py-3 border rounded-xl dark:bg-slate-800 dark:border-slate-600"
                minLength={4}
              />
            </div>
            <p className="text-sm text-slate-500">Host: <strong>dynamic</strong></p>
          </div>
        )}

        <button
          type="button"
          onClick={saveConnection}
          disabled={saving || (authType === 'ip' && !clientIp.trim())}
          className="mt-6 w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save SIP credentials'}
        </button>
      </div>

      {/* Caller ID — dynamic only */}
      {!isIp && authType === 'dynamic' && (
        <div className="bg-white dark:bg-zydex-bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Phone size={20} className="text-emerald-600" />
            <h2 className="font-semibold text-lg dark:text-white">Caller ID</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">Outgoing calls will show this number (standard accounts only)</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={callerId}
              onChange={(e) => setCallerId(e.target.value)}
              placeholder="e.g. 12125551234"
              className="flex-1 px-4 py-3 border rounded-xl dark:bg-slate-800 dark:border-slate-600"
            />
            <button
              type="button"
              onClick={saveCallerId}
              disabled={savingCallerId || callerId.trim().length < 3}
              className="px-6 py-3 bg-emerald-700 dark:bg-emerald-600 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {savingCallerId ? 'Saving...' : 'Update Caller ID'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Current: {sip.callerId || 'Not set'}</p>
        </div>
      )}

      {isIp && (
        <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm dark:text-slate-300">
          <strong>IP-to-IP active.</strong> Registered IP: <code className="font-mono">{sip.clientIp || sip.host}</code>
          — no password required. Connect your equipment to server <strong>{serverIp}</strong>.
        </div>
      )}
    </div>
  );
}
