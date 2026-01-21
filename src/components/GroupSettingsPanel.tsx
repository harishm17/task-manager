import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../contexts/GroupContext';
import { deleteGroup, updateGroupName } from '../lib/api/groups';
import { fetchGroupMembers, fetchGroupRole, leaveGroup } from '../lib/api/groupMembers';
import { hasSupabaseEnv } from '../lib/supabaseClient';

type GroupSettingsPanelProps = {
  groupId: string;
  groupName: string;
  groupType: 'personal' | 'household';
};

export function GroupSettingsPanel({ groupId, groupName, groupType }: GroupSettingsPanelProps) {
  const { user } = useAuth();
  const { groups, refreshGroups, setActiveGroupId } = useGroups();
  const [name, setName] = useState(groupName);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSuccess, setRenameSuccess] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  useEffect(() => {
    setName(groupName);
  }, [groupName]);

  const { data: role } = useQuery({
    queryKey: ['group-role', groupId, user?.id],
    queryFn: () => fetchGroupRole({ groupId, userId: user?.id ?? '' }),
    enabled: Boolean(groupId && user?.id && hasSupabaseEnv),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => fetchGroupMembers(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv && groupType === 'household'),
  });

  const adminCount = useMemo(() => members.filter((member) => member.role === 'admin').length, [members]);
  const isAdmin = role === 'admin';
  const isLastAdmin = isAdmin && adminCount <= 1;
  const isHousehold = groupType === 'household';

  const renameMutation = useMutation({
    mutationFn: async () => {
      if (!hasSupabaseEnv) {
        throw new Error('Set Supabase env vars to update groups.');
      }
      if (!isAdmin) {
        throw new Error('Only admins can rename this group.');
      }
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error('Group name cannot be empty.');
      }
      return updateGroupName({ groupId, name: trimmed });
    },
    onSuccess: async () => {
      await refreshGroups();
      setRenameSuccess('Group name updated.');
      setRenameError(null);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : 'Failed to update group.';
      setRenameError(message);
      setRenameSuccess(null);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Missing user session.');
      }
      if (!hasSupabaseEnv) {
        throw new Error('Set Supabase env vars to leave groups.');
      }
      if (isLastAdmin) {
        throw new Error('Add another admin before leaving this group.');
      }
      return leaveGroup({ groupId, userId: user.id });
    },
    onSuccess: async () => {
      const fallback = groups.find((group) => group.type === 'personal') ?? groups.find((group) => group.id !== groupId);
      if (fallback) {
        setActiveGroupId(fallback.id);
      }
      await refreshGroups();
      setLeaveSuccess('You left the group.');
      setLeaveError(null);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : 'Failed to leave group.';
      setLeaveError(message);
      setLeaveSuccess(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!hasSupabaseEnv) {
        throw new Error('Set Supabase env vars to delete groups.');
      }
      if (!isAdmin) {
        throw new Error('Only admins can delete this group.');
      }
      return deleteGroup(groupId);
    },
    onSuccess: async () => {
      const fallback = groups.find((group) => group.type === 'personal') ?? groups.find((group) => group.id !== groupId);
      if (fallback) {
        setActiveGroupId(fallback.id);
      }
      await refreshGroups();
      setDeleteSuccess('Group deleted.');
      setDeleteError(null);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : 'Failed to delete group.';
      setDeleteError(message);
      setDeleteSuccess(null);
    },
  });

  if (!isHousehold) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Group settings</p>
          <p className="mt-2 text-sm text-slate-500">Personal groups cannot be renamed or left.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Group settings</p>
          <p className="text-sm text-slate-600">Rename this household or leave the group.</p>
        </div>
        <form
          className="grid gap-3 md:grid-cols-[1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setRenameSuccess(null);
            setRenameError(null);
            renameMutation.mutate();
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Group name"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!isAdmin || renameMutation.isPending || !hasSupabaseEnv}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {renameMutation.isPending ? 'Saving...' : 'Save name'}
          </button>
        </form>
        {renameError ? <p className="text-sm text-rose-600">{renameError}</p> : null}
        {renameSuccess ? <p className="text-sm text-emerald-600">{renameSuccess}</p> : null}
        {!isAdmin ? (
          <p className="text-xs text-slate-500">Only admins can rename this group.</p>
        ) : null}

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Leave group</p>
          <p className="mt-1 text-sm text-slate-600">
            You can leave this household. Your tasks and expenses stay in place.
          </p>
          {isLastAdmin ? (
            <p className="mt-2 text-xs text-amber-600">Add another admin before leaving.</p>
          ) : null}
          {leaveError ? <p className="mt-2 text-xs text-rose-600">{leaveError}</p> : null}
          {leaveSuccess ? <p className="mt-2 text-xs text-emerald-600">{leaveSuccess}</p> : null}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Leave this group?')) {
                leaveMutation.mutate();
              }
            }}
            disabled={leaveMutation.isPending || isLastAdmin || !hasSupabaseEnv}
            className="mt-3 rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:text-rose-300"
          >
            {leaveMutation.isPending ? 'Leaving...' : 'Leave group'}
          </button>
        </div>

        <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
          <p className="text-xs uppercase tracking-wide text-rose-400">Delete group</p>
          <p className="mt-1 text-sm text-slate-600">
            This permanently removes the group, its tasks, and expenses for everyone.
          </p>
          {deleteError ? <p className="mt-2 text-xs text-rose-600">{deleteError}</p> : null}
          {deleteSuccess ? <p className="mt-2 text-xs text-emerald-600">{deleteSuccess}</p> : null}
          {!isAdmin ? (
            <p className="mt-2 text-xs text-slate-500">Only admins can delete this group.</p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete this group permanently?')) {
                deleteMutation.mutate();
              }
            }}
            disabled={!isAdmin || deleteMutation.isPending || !hasSupabaseEnv}
            className="mt-3 rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:text-rose-300"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete group'}
          </button>
        </div>
      </div>
    </section>
  );
}
