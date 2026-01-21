import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { createInvitation, fetchInvitations } from '../lib/api/invitations';
import { fetchGroupRole } from '../lib/api/groupMembers';
import { hasSupabaseEnv } from '../lib/supabaseClient';

const formatDate = (value: string) => new Date(value).toLocaleDateString();

type InvitePanelProps = {
  groupId: string;
  groupName: string;
};

export function InvitePanel({ groupId, groupName }: InvitePanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations', groupId],
    queryFn: () => fetchInvitations(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const { data: role } = useQuery({
    queryKey: ['group-role', groupId, user?.id],
    queryFn: () => fetchGroupRole({ groupId, userId: user?.id ?? '' }),
    enabled: Boolean(groupId && user?.id && hasSupabaseEnv),
  });

  const isAdmin = role === 'admin';

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Missing user session.');
      }
      return createInvitation({
        groupId,
        email: email.trim() || undefined,
        invitedBy: user.id,
      });
    },
    onSuccess: (invite) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', groupId] });
      setEmail('');
      setFormError(null);
      setInviteLink(`${window.location.origin}/invite/${invite.token}`);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : 'Failed to create invite.';
      setFormError(message);
    },
  });

  const copyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch (err) {
      console.error('Clipboard write failed', err);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Invites</p>
          <p className="text-sm font-semibold text-slate-800">Invite roommates to {groupName}</p>
        </div>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setFormError(null);
            createMutation.mutate();
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email (optional)"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!hasSupabaseEnv || createMutation.isPending || !isAdmin}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {createMutation.isPending ? 'Creating...' : 'Create invite'}
          </button>
        </form>
        {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
        {!isAdmin ? <p className="text-xs text-slate-500">Only admins can create invites.</p> : null}
        {!hasSupabaseEnv ? (
          <p className="text-xs text-amber-600">Set Supabase env vars to enable invites.</p>
        ) : null}
        {inviteLink ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Invite link</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-700 break-all">{inviteLink}</span>
              <button
                type="button"
                onClick={copyLink}
                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600"
              >
                Copy
              </button>
            </div>
          </div>
        ) : null}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Pending invites</p>
          {invitations.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No invites yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {invitations.map((invite) => (
                <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-700">{invite.email ?? 'Invite link'}</span>
                  <span className="text-xs text-slate-500">
                    {invite.status} · expires {formatDate(invite.expires_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
