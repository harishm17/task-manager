import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, hasSupabaseEnv } from '../lib/supabaseClient';

export function LoginPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasSupabaseEnv) {
      setError('Missing Supabase environment variables.');
      return;
    }
    setLoading(true);
    setError(null);

    if (!supabase) {
      setError('Supabase client not initialized.');
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Welcome back</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Sign in to DivvyDo</h1>
        <p className="mt-2 text-sm text-slate-500">
          Keep your personal tasks private while syncing household work.
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            placeholder="••••••••"
            required
          />
        </label>
        <div className="text-right text-xs">
          <Link className="font-semibold text-slate-600 hover:text-slate-900" to="/reset-password">
            Forgot password?
          </Link>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {!hasSupabaseEnv ? (
          <p className="text-xs text-amber-600">Set Supabase env vars to enable sign in.</p>
        ) : null}
        <button
          type="submit"
          disabled={loading || !hasSupabaseEnv}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <div className="text-sm text-slate-500">
        New to DivvyDo?{' '}
        <Link className="font-semibold text-slate-900" to="/signup">
          Create an account
        </Link>
      </div>
    </div>
  );
}
