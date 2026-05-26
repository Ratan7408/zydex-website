import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { BrandLogo } from '../components/BrandLogo';

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    id_plan: '',
  });
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api('/auth/plans')
      .then((r) => setPlans(r.rows || []))
      .catch(() => setPlans([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!form.id_plan) {
      setError('Please select a plan');
      return;
    }
    setLoading(true);
    try {
      await signup({ ...form, id_plan: Number(form.id_plan) });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 border border-emerald-200 dark:border-zydex-border rounded-lg outline-none focus:ring-2 focus:ring-lime-500 dark:bg-emerald-950/30 dark:text-white';

  const field = (name, label, type = 'text', required = true, hint) => (
    <div>
      <label className="block text-sm font-medium mb-1 text-emerald-900 dark:text-emerald-200">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        autoComplete={
          name === 'password' ? 'new-password' : name === 'confirmPassword' ? 'new-password' : name
        }
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className={inputClass}
        required={required}
        minLength={name === 'password' ? 4 : undefined}
      />
      {hint && <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zydex-bg via-emerald-950 to-zydex-bg py-6 px-4">
      <BrandLogo size="auth" className="mb-5 shrink-0" />
      <div className="bg-white dark:bg-zydex-bg-card rounded-2xl shadow-xl border border-emerald-200/20 dark:border-zydex-border w-full max-w-lg p-6 sm:p-8">
        <h1 className="text-xl font-bold text-center mb-1 text-emerald-950 dark:text-emerald-50">Create an Account</h1>
        <p className="text-center text-sm text-emerald-700 dark:text-emerald-300 mb-4">
          Join us by filling out the form below. Fields marked * are required.
        </p>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {plans.length === 0 && (
          <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
            No signup plans available yet. Ask admin to add plans in Admin Panel → Plans.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field('firstname', 'First Name')}
            {field('lastname', 'Last Name', 'text', false)}
          </div>
          {field('username', 'Username')}
          {field('email', 'Email', 'email', false)}
          {field('password', 'Password', 'password', true, 'Minimum length is 4 characters.')}
          {field('confirmPassword', 'Confirm Password', 'password', true, 'Please re-enter your password.')}

          <div>
            <label className="block text-sm font-medium mb-1 text-emerald-900 dark:text-emerald-200">
              Select Your Plan <span className="text-red-500">*</span>
            </label>
            <select
              value={form.id_plan}
              onChange={(e) => setForm({ ...form, id_plan: e.target.value })}
              className={`${inputClass} bg-white`}
              required
            >
              <option value="">Select a Plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.magnusPlanId}>
                  {p.name}
                  {p.description ? ` — ${p.description}` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || plans.length === 0}
            className="w-full bg-lime-500 hover:bg-lime-400 text-zydex-bg py-3 rounded-lg font-semibold mt-2 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-sm mt-4 text-emerald-700 dark:text-emerald-300">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-lime-600 dark:text-lime-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
