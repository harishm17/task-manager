import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasSupabaseEnv, supabase } from '../lib/supabaseClient';

export function UpdatePasswordPage() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasSupabaseEnv) {
      setError('Missing Supabase environment variables.');
      return;
    }
    if (!supabase) {
      setError('Supabase client not initialized.');
      return;
    }
    if (!user) {
      setError('Open the password reset link from your email to continue.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('saving');
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setStatus('idle');
      return;
    }

    setStatus('saved');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Set a new password</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Choose a new password</h1>
        <p className="mt-2 text-sm text-slate-500">
          Use a strong password that you do not reuse elsewhere.
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          New password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            placeholder="••••••••"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Confirm password
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            placeholder="••••••••"
            required
          />
        </label>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {status === 'saved' ? (
          <p className="text-sm text-emerald-600">Password updated. You can sign in again.</p>
        ) : null}
        {!hasSupabaseEnv ? (
          <p className="text-xs text-amber-600">Set Supabase env vars to enable password reset.</p>
        ) : null}
        <button
          type="submit"
          disabled={status === 'saving' || !hasSupabaseEnv}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {status === 'saving' ? 'Saving...' : 'Update password'}
        </button>
      </form>
      <div className="text-sm text-slate-500">
        <Link className="font-semibold text-slate-900" to="/login">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
