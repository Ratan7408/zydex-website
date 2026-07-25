import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Shield, Wallet, Zap, Menu, X } from 'lucide-react';
import { BrandLogo, BrandLogoImage } from '../components/BrandLogo';

const features = [
  { icon: Phone, title: 'VOIP Self-Service', desc: 'Sign up, get SIP credentials instantly, and start calling.' },
  { icon: Wallet, title: 'Crypto Top-Up', desc: 'Add balance with BTC, ETH, or USDT — credited automatically.' },
  { icon: Shield, title: 'Magnus Billing', desc: 'Same credentials as your Magnus account, synced in real time.' },
  { icon: Zap, title: 'CDR & Rates', desc: 'View call history, live rates, and account balance anytime.' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-zydex-bg via-emerald-950 to-zydex-bg text-emerald-50">
      <header className="sticky top-0 z-30 border-b border-zydex-border/60 bg-zydex-bg/90 backdrop-blur-md overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-3 min-w-0">
          <BrandLogo to="/" size="header" />

          <nav className="hidden sm:flex items-center gap-2 shrink-0 flex-nowrap ml-auto">
            <Link
              to="/login"
              className="whitespace-nowrap px-4 py-2 rounded-lg border border-emerald-700/80 text-emerald-100 hover:bg-emerald-900/50 text-sm font-medium shrink-0"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="whitespace-nowrap px-4 py-2 rounded-lg bg-lime-500 hover:bg-lime-400 text-zydex-bg font-semibold text-sm shrink-0"
            >
              Get Started
            </Link>
          </nav>

          <button
            type="button"
            className="sm:hidden p-2 rounded-lg border border-emerald-800 text-emerald-200"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden border-t border-zydex-border px-4 py-3 flex flex-col gap-2 bg-zydex-bg-card">
            <Link to="/login" className="py-2.5 text-center rounded-lg border border-emerald-700" onClick={() => setMenuOpen(false)}>
              Sign In
            </Link>
            <Link
              to="/register"
              className="py-2.5 text-center rounded-lg bg-lime-500 text-zydex-bg font-semibold"
              onClick={() => setMenuOpen(false)}
            >
              Get Started
            </Link>
          </div>
        )}
      </header>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-center">
        <div className="flex flex-col items-center gap-2 sm:gap-3 w-full">
          <p className="text-lime-400 font-semibold text-sm sm:text-base">VOIP Management Platform</p>

          <BrandLogoImage size="hero" className="mx-auto w-full" />

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight px-1 mt-1">
            Your clients. Your brand.
            <br />
            <span className="text-lime-400">Self-service portal.</span>
          </h1>
        </div>

        <p className="text-emerald-200/80 text-base sm:text-lg max-w-2xl mx-auto mt-4 sm:mt-5 mb-6 sm:mb-8 px-2">
          Zydex connects your Magnus Billing system to a modern client portal — signup, SIP credentials, balance, CDR,
          and crypto payments in one place.
        </p>
        <Link
          to="/register"
          className="inline-block bg-lime-500 hover:bg-lime-400 text-zydex-bg px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg shadow-lg shadow-lime-500/20"
        >
          Create Free Account
        </Link>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {features.map((f) => (
          <div
            key={f.title}
            className="bg-zydex-bg-card border border-zydex-border rounded-2xl p-5 sm:p-6 hover:border-lime-500/40 transition-colors"
          >
            <f.icon className="text-lime-400 mb-4" size={32} />
            <h3 className="font-semibold text-lg mb-2 text-emerald-50">{f.title}</h3>
            <p className="text-emerald-200/70 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-zydex-border py-6 text-center text-emerald-400/60 text-sm px-4">
        © {new Date().getFullYear()} Zydex. All rights reserved.
      </footer>
    </div>
  );
}
