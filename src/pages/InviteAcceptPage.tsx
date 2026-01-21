import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { acceptInvitation } from '../lib/api/invitations';

export function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!token) {
      setStatus('error');
      setMessage('Invalid invite link.');
      return;
    }

    setStatus('loading');
    acceptInvitation(token)
      .then(({ groupId }) => {
        setStatus('success');
        setMessage('Invite accepted. Redirecting...');
        setTimeout(() => {
          navigate('/dashboard', { replace: true, state: { groupId } });
        }, 1000);
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to accept invite.');
      });
  }, [token, user, loading, navigate]);

  if (loading) {
    return <p className="text-sm text-slate-500">Checking invite...</p>;
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Join this household</h1>
        <p className="text-sm text-slate-500">Sign in to accept your invite.</p>
        <Link
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          to="/login"
          state={{ from: location.pathname }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Accepting invite</h1>
      <p className="text-sm text-slate-500">
        {status === 'loading' && 'Processing your invite...'}
        {status === 'success' && message}
        {status === 'error' && message}
        {status === 'idle' && 'Ready to join.'}
      </p>
      {status === 'error' ? (
        <Link className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" to="/dashboard">
          Back to dashboard
        </Link>
      ) : null}
    </div>
  );
}
