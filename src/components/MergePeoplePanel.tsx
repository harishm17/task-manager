import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { fetchGroupPeople } from '../lib/api/groupPeople';
import { fetchGroupRole } from '../lib/api/groupMembers';
import { fetchMergeAudit, mergePeople } from '../lib/api/mergePeople';
import { hasSupabaseEnv } from '../lib/supabaseClient';

const formatDate = (value: string) => new Date(value).toLocaleString();

type MergePeoplePanelProps = {
  groupId: string;
  groupName: string;
};

export function MergePeoplePanel({ groupId, groupName }: MergePeoplePanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: people = [] } = useQuery({
    queryKey: ['group-people', groupId],
    queryFn: () => fetchGroupPeople(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const { data: role } = useQuery({
    queryKey: ['group-role', groupId, user?.id],
    queryFn: () => fetchGroupRole({ groupId, userId: user?.id ?? '' }),
    enabled: Boolean(groupId && user?.id && hasSupabaseEnv),
  });

  const { data: auditEntries = [] } = useQuery({
    queryKey: ['merge-audit', groupId],
    queryFn: () => fetchMergeAudit(groupId),
    enabled: Boolean(groupId && role === 'admin' && hasSupabaseEnv),
  });

  const mergeMutation = useMutation({
    mutationFn: async () => {
      if (!sourceId || !targetId) {
        throw new Error('Select both source and target.');
      }
      if (sourceId === targetId) {
        throw new Error('Source and target must be different.');
      }
      return mergePeople({ groupId, sourcePersonId: sourceId, targetPersonId: targetId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-people', groupId] });
      queryClient.invalidateQueries({ queryKey: ['merge-audit', groupId] });
      setSourceId('');
      setTargetId('');
      setFormError(null);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : 'Failed to merge people.';
      setFormError(message);
    },
  });

  const unclaimed = people.filter((person) => !person.user_id);
  const claimed = people.filter((person) => person.user_id);
  const isAdmin = role === 'admin';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Admin merge</p>
          <p className="text-sm font-semibold text-slate-800">Merge placeholders in {groupName}</p>
        </div>
        {!isAdmin ? (
          <p className="text-sm text-slate-500">Only admins can merge people.</p>
        ) : null}
        <form
          className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setFormError(null);
            mergeMutation.mutate();
          }}
        >
          <select
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            disabled={!isAdmin}
          >
            <option value="">Source (unclaimed)</option>
            {unclaimed.map((person) => (
              <option key={person.id} value={person.id}>
                {person.display_name}
              </option>
            ))}
          </select>
          <select
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            disabled={!isAdmin}
          >
            <option value="">Target (claimed)</option>
            {claimed.map((person) => (
              <option key={person.id} value={person.id}>
                {person.display_name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!isAdmin || mergeMutation.isPending || !sourceId || !targetId}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {mergeMutation.isPending ? 'Merging...' : 'Merge'}
          </button>
        </form>
        {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
        {!hasSupabaseEnv ? (
          <p className="text-xs text-amber-600">Set Supabase env vars to enable merges.</p>
        ) : null}
        {isAdmin ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Merge audit</p>
            {auditEntries.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No merges yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {auditEntries.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-700">
                      {entry.source?.display_name ?? 'Unknown'} → {entry.target?.display_name ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(entry.merged_at)} · moved {entry.moved_counts?.tasks ?? 0} tasks
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
