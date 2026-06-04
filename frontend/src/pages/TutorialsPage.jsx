import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Download,
  KeyRound,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { WHATSAPP_SUPPORT, WHATSAPP_DISPLAY } from '../constants/brand';

const DEFAULT_SUPPORT = 'https://t.me/zydex_p1';
const SIP_PORT = '5060';

const platformBadges = [
  { name: 'PortSIP', color: 'bg-red-500', url: 'https://www.portsip.com/download' },
  { name: 'Zoiper', color: 'bg-orange-500', url: 'https://www.zoiper.com/en/voip-softphone/download/current' },
  { name: 'MicroSIP', color: 'bg-blue-500', url: 'https://www.microsip.org/downloads' },
  { name: 'Android', color: 'bg-green-600', url: 'https://play.google.com/store/apps/details?id=com.zoiper.android.app' },
  { name: 'iOS / macOS', color: 'bg-slate-700', url: 'https://apps.apple.com/app/zoiper-softphone/id392051532' },
  { name: 'Windows', color: 'bg-sky-500', url: 'https://www.microsip.org/downloads' },
];

const softphones = [
  {
    platform: 'Android',
    apps: [
      { name: 'Zoiper', url: 'https://play.google.com/store/apps/details?id=com.zoiper.android.app' },
      { name: 'Linphone', url: 'https://play.google.com/store/apps/details?id=org.linphone' },
    ],
  },
  {
    platform: 'iOS',
    apps: [
      { name: 'Zoiper', url: 'https://apps.apple.com/app/zoiper-softphone/id392051532' },
      { name: 'Linphone', url: 'https://apps.apple.com/app/linphone/id341055604' },
    ],
  },
  {
    platform: 'Windows',
    apps: [
      { name: 'MicroSIP', url: 'https://www.microsip.org/downloads' },
      { name: 'Zoiper', url: 'https://www.zoiper.com/en/voip-softphone/download/current' },
    ],
  },
  {
    platform: 'macOS',
    apps: [
      { name: 'Zoiper', url: 'https://www.zoiper.com/en/voip-softphone/download/current' },
      { name: 'Linphone', url: 'https://www.linphone.org/releases' },
    ],
  },
];

const dialFormats = [
  { country: 'Italy', example: '39XXXXXXXXX' },
  { country: 'USA', example: '1XXXXXXXXXX' },
  { country: 'France', example: '33XXXXXXXXX' },
];

function StepBadge({ n }) {
  return (
    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
      {n}
    </div>
  );
}

function CopyField({ label, value, field, copied, onCopy }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <div className="flex gap-2">
        <code className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-mono break-all dark:text-white">
          {value}
        </code>
        <button
          type="button"
          onClick={() => onCopy(value, field)}
          className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
          title="Copy"
        >
          {copied === field ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function TutorialsPage() {
  const { user } = useAuth();
  const [supportUrl, setSupportUrl] = useState(DEFAULT_SUPPORT);
  const [sip, setSip] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    api('/public/config')
      .then((c) => {
        if (c.telegramSupportUrl) setSupportUrl(c.telegramSupportUrl);
      })
      .catch(() => {});
    api('/user/sip')
      .then(setSip)
      .catch(() => {});
  }, []);

  const copy = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  const telegramHref = supportUrl.startsWith('http') ? supportUrl : `https://${supportUrl}`;
  const serverHost = sip?.voipUrl || sip?.server || '—';
  const sipUser = sip?.username || user?.username || 'your SIP username';
  const isIpAuth = sip?.authType === 'ip';

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <BookOpen className="text-emerald-600" size={28} />
            How to Use — Quick VoIP Setup
          </h1>
          <p className="text-slate-500 mt-2">
            Get your SIP account, install a softphone, and start calling in minutes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#229ED9] hover:bg-[#1a8bc4] text-white font-semibold rounded-xl shadow-md"
          >
            <MessageCircle size={20} />
            Telegram
            <ExternalLink size={16} />
          </a>
          <a
            href={WHATSAPP_SUPPORT}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold rounded-xl shadow-md"
          >
            WhatsApp
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {platformBadges.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${p.color} text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90`}
          >
            {p.name}
          </a>
        ))}
      </div>

      <div className="space-y-6">
        <section className="bg-white dark:bg-zydex-bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex gap-4">
            <StepBadge n={1} />
            <div className="flex-1">
              <h2 className="text-lg font-semibold dark:text-white">Create your SIP user</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                Register or log in to Zydex. Your SIP username and password are created automatically and
                synced with Magnus Billing.
              </p>
              <Link
                to="/sip"
                className="inline-flex items-center gap-2 mt-4 text-emerald-600 font-semibold text-sm hover:underline"
              >
                <KeyRound size={16} />
                Open SIP &amp; Connection
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-zydex-bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex gap-4 mb-6">
            <StepBadge n={2} />
            <div>
              <h2 className="text-lg font-semibold dark:text-white">Download a softphone</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                Pick an app for your device. All support standard SIP registration.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {softphones.map((sp) => (
              <div
                key={sp.platform}
                className="border rounded-xl p-4 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
              >
                <p className="font-semibold dark:text-white mb-3 flex items-center gap-2">
                  <Download size={18} className="text-emerald-600" />
                  {sp.platform}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sp.apps.map((app) => (
                    <a
                      key={app.name}
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white dark:bg-zydex-bg-card border rounded-lg text-sm font-medium hover:border-lime-400 dark:text-white"
                    >
                      {app.name}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-zydex-bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex gap-4">
            <StepBadge n={3} />
            <div className="flex-1">
              <h2 className="text-lg font-semibold dark:text-white">Login in the app</h2>
              <ul className="text-sm text-slate-600 dark:text-slate-400 mt-3 space-y-2">
                <li>
                  <strong className="text-slate-800 dark:text-slate-200">Username:</strong> your Zydex SIP username
                  <code className="ml-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs">
                    {sipUser}
                  </code>
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-slate-200">Password:</strong>{' '}
                  {isIpAuth ? (
                    <span>not used (IP-to-IP mode)</span>
                  ) : (
                    <span>
                      your SIP password — see{' '}
                      <Link to="/sip" className="text-emerald-600 hover:underline">
                        SIP Credentials
                      </Link>
                    </span>
                  )}
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-slate-200">Host / Domain:</strong> {serverHost}
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-slate-200">Port:</strong> UDP {SIP_PORT} (Zoiper will ask)
                </li>
              </ul>

              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <CopyField
                  label="Copy Host"
                  value={serverHost}
                  field="host"
                  copied={copied}
                  onCopy={copy}
                />
                <CopyField
                  label="UDP Port"
                  value={SIP_PORT}
                  field="port"
                  copied={copied}
                  onCopy={copy}
                />
              </div>

              <p className="text-xs text-slate-500 mt-4">
                Use exact casing for username and password. Enter the host as IP only — do not include http:// or
                https://.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-zydex-bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex gap-4">
            <StepBadge n={4} />
            <div className="flex-1">
              <h2 className="text-lg font-semibold dark:text-white">Add Caller ID (required)</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                Add a verified Caller ID in the portal before calling. Calls may not start without it (standard SIP
                accounts only).
              </p>
              {!isIpAuth ? (
                <Link
                  to="/sip"
                  className="inline-flex items-center gap-2 mt-4 text-emerald-600 font-semibold text-sm hover:underline"
                >
                  <Phone size={16} />
                  Set Caller ID in SIP page
                  <ChevronRight size={16} />
                </Link>
              ) : (
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-3 flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  Caller ID is not available in IP-to-IP mode.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-zydex-bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex gap-4">
            <StepBadge n={5} />
            <div className="flex-1">
              <h2 className="text-lg font-semibold dark:text-white">Dial format</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                Dial using country prefix + mobile number (no spaces or plus sign in most apps):
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                {dialFormats.map((d) => (
                  <div
                    key={d.country}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border dark:border-slate-700"
                  >
                    <span className="text-sm font-medium dark:text-white">{d.country}:</span>{' '}
                    <code className="text-sm font-mono text-emerald-700 dark:text-lime-400">{d.example}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-zydex-bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex gap-4">
            <StepBadge n={6} />
            <div className="flex-1">
              <h2 className="text-lg font-semibold dark:text-white">Troubleshooting</h2>
              <ul className="text-sm text-slate-600 dark:text-slate-400 mt-3 space-y-2 list-disc list-inside">
                <li>Re-check username and password (case sensitive)</li>
                <li>
                  Confirm domain / host is <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">{serverHost}</code>
                </li>
                <li>
                  Ensure your network allows <strong>UDP {SIP_PORT}</strong>
                </li>
                <li>Try using a VPN if your ISP blocks SIP</li>
                <li>Reboot your phone or computer</li>
                <li>Check balance and Caller ID in the portal before placing calls</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-zydex-bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex gap-4">
            <StepBadge n={7} />
            <div className="flex-1">
              <h2 className="text-lg font-semibold dark:text-white">Manage your account</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                Top up balance, check rates, and view call history from the portal menu.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <Link to="/funds" className="text-sm font-semibold text-emerald-600 hover:underline">
                  Funds Management
                </Link>
                <Link to="/rates" className="text-sm font-semibold text-emerald-600 hover:underline">
                  Call Rates
                </Link>
                <Link to="/cdr" className="text-sm font-semibold text-emerald-600 hover:underline">
                  CDR Reports
                </Link>
                <Link to="/live" className="text-sm font-semibold text-emerald-600 hover:underline flex items-center gap-1">
                  <Phone size={14} /> Live Calls
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-[#229ED9]/10 to-emerald-50 dark:from-[#229ED9]/20 dark:to-slate-900 rounded-2xl border border-[#229ED9]/30 p-6">
          <h2 className="font-semibold text-lg dark:text-white flex items-center gap-2">
            <MessageCircle className="text-[#229ED9]" size={22} />
            Need help?
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Message us on Telegram or WhatsApp for setup help, billing questions, or technical support.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#229ED9] text-white font-semibold rounded-xl hover:bg-[#1a8bc4]"
            >
              @zydex_p1 on Telegram
              <ExternalLink size={16} />
            </a>
            <a
              href={WHATSAPP_SUPPORT}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#1da851]"
            >
              {WHATSAPP_DISPLAY} on WhatsApp
              <ExternalLink size={16} />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
