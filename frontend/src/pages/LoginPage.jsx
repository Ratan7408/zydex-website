import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/BrandLogo';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zydex-bg via-emerald-950 to-zydex-bg px-4 py-6 sm:py-8">
      <BrandLogo size="auth" className="mb-5 sm:mb-6 shrink-0" />

      <div className="w-full max-w-md bg-white dark:bg-zydex-bg-card rounded-2xl shadow-2xl border border-emerald-200/20 dark:border-zydex-border p-6 sm:p-8">
        <h1 className="text-xl font-bold text-center mb-6 text-emerald-950 dark:text-emerald-50">Sign in to your account</h1>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-200 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full px-4 py-2.5 border border-emerald-200 dark:border-zydex-border rounded-lg focus:ring-2 focus:ring-lime-500 outline-none dark:bg-emerald-950/30 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-200 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-2.5 border border-emerald-200 dark:border-zydex-border rounded-lg focus:ring-2 focus:ring-lime-500 outline-none pr-10 dark:bg-emerald-950/30 dark:text-white"
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-lime-500 hover:bg-lime-400 text-zydex-bg py-3 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-emerald-700 dark:text-emerald-300 mt-6">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-lime-600 dark:text-lime-400 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
