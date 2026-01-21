import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { fetchGroupPeople } from '../lib/api/groupPeople';
import { fetchGroupMembers, updateGroupMemberRole } from '../lib/api/groupMembers';
import { hasSupabaseEnv } from '../lib/supabaseClient';

type GroupMembersPanelProps = {
  groupId: string;
  groupName: string;
};

export function GroupMembersPanel({ groupId, groupName }: GroupMembersPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [roleError, setRoleError] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => fetchGroupMembers(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const { data: people = [] } = useQuery({
    queryKey: ['group-people', groupId],
    queryFn: () => fetchGroupPeople(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const peopleByUserId = useMemo(() => {
    const map = new Map<string, { name: string; email: string | null }>();
    people
      .filter((person) => person.user_id)
      .forEach((person) => {
        map.set(person.user_id as string, {
          name: person.display_name,
          email: person.email ?? null,
        });
      });
    return map;
  }, [people]);

  const adminCount = members.filter((member) => member.role === 'admin').length;
  const currentRole = members.find((member) => member.user_id === user?.id)?.role ?? 'member';
  const isAdmin = currentRole === 'admin';

  const updateRoleMutation = useMutation({
    mutationFn: async (params: { userId: string; role: 'admin' | 'member'; currentRole: string }) => {
      if (!isAdmin) {
        throw new Error('Only admins can update roles.');
      }
      if (params.currentRole === 'admin' && adminCount <= 1 && params.role === 'member') {
        throw new Error('At least one admin is required.');
      }
      return updateGroupMemberRole({
        groupId,
        userId: params.userId,
        role: params.role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      setRoleError(null);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : 'Failed to update role.';
      setRoleError(message);
    },
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Members & roles</p>
          <p className="text-sm text-slate-600">Manage household access for {groupName}.</p>
        </div>
        {roleError ? <p className="text-sm text-rose-600">{roleError}</p> : null}
        {isLoading ? <p className="text-sm text-slate-500">Loading members...</p> : null}
        {!isLoading && members.length === 0 ? (
          <p className="text-sm text-slate-500">No members yet.</p>
        ) : null}
        <ul className="space-y-2 text-sm">
          {members.map((member) => {
            const profile = peopleByUserId.get(member.user_id);
            const isSelf = member.user_id === user?.id;
            const disableRoleChange =
              !isAdmin || (member.role === 'admin' && adminCount <= 1) || !hasSupabaseEnv;

            return (
              <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">
                    {profile?.name ?? 'Member'} {isSelf ? '(You)' : ''}
                  </p>
                  {profile?.email ? <p className="text-xs text-slate-500">{profile.email}</p> : null}
                </div>
                <select
                  value={member.role}
                  onChange={(event) =>
                    updateRoleMutation.mutate({
                      userId: member.user_id,
                      role: event.target.value as 'admin' | 'member',
                      currentRole: member.role,
                    })
                  }
                  disabled={disableRoleChange || updateRoleMutation.isPending}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              </li>
            );
          })}
        </ul>
        {!isAdmin ? (
          <p className="text-xs text-slate-500">Only admins can change member roles.</p>
        ) : null}
        {isAdmin && adminCount <= 1 ? (
          <p className="text-xs text-amber-600">Assign another admin before demoting yourself.</p>
        ) : null}
      </div>
    </section>
  );
}
