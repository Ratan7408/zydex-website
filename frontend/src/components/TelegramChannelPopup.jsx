import { useEffect, useState } from 'react';
import { X, Send } from 'lucide-react';
import { TELEGRAM_CHANNEL } from '../constants/brand';

const STORAGE_KEY = 'zydex_telegram_channel_dismissed';

export default function TelegramChannelPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const join = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    window.open(TELEGRAM_CHANNEL, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tg-channel-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-emerald-800/60 bg-zydex-bg-card shadow-2xl p-6 sm:p-8 text-emerald-50">
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 p-2 rounded-lg text-emerald-300 hover:bg-emerald-900/50 hover:text-white"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#229ED9]/20 text-[#229ED9] mb-4 mx-auto">
          <Send size={28} />
        </div>

        <h2 id="tg-channel-title" className="text-xl font-bold text-center mb-2">
          Join our Telegram channel
        </h2>
        <p className="text-emerald-200/80 text-sm text-center mb-6">
          Get service updates, rate changes, and announcements from Zydex. Join{' '}
          <span className="text-lime-400 font-medium">zydex_services</span> on Telegram.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={join}
            className="w-full py-3 rounded-xl bg-[#229ED9] hover:bg-[#1a8bc4] text-white font-semibold transition-colors"
          >
            Join Telegram Channel
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="w-full py-2.5 rounded-xl text-emerald-300 hover:text-emerald-100 text-sm font-medium"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
