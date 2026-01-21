import { useState } from 'react';
import { Link } from 'react-router-dom';
import { hasSupabaseEnv, supabase } from '../lib/supabaseClient';

export function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
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

    setStatus('sending');
    setError(null);

    const redirectTo = `${window.location.origin}/update-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (resetError) {
      setError(resetError.message);
      setStatus('idle');
      return;
    }

    setStatus('sent');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Password reset</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter your email and we will send a secure link to set a new password.
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
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {status === 'sent' ? (
          <p className="text-sm text-emerald-600">Check your email for a reset link.</p>
        ) : null}
        {!hasSupabaseEnv ? (
          <p className="text-xs text-amber-600">Set Supabase env vars to enable password reset.</p>
        ) : null}
        <button
          type="submit"
          disabled={status === 'sending' || !hasSupabaseEnv}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {status === 'sending' ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
      <div className="text-sm text-slate-500">
        Remembered it?{' '}
        <Link className="font-semibold text-slate-900" to="/login">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
