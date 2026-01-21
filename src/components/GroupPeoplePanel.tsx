import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGroupPerson, fetchGroupPeople } from '../lib/api/groupPeople';
import { hasSupabaseEnv } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

type GroupPeoplePanelProps = {
  groupId: string;
  groupName: string;
};

export function GroupPeoplePanel({ groupId, groupName }: GroupPeoplePanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: people,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['group-people', groupId],
    queryFn: () => fetchGroupPeople(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Missing user session.');
      }
      return createGroupPerson({
        groupId,
        displayName: displayName.trim(),
        email: email.trim() || undefined,
        createdBy: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-people', groupId] });
      setDisplayName('');
      setEmail('');
      setFormError(null);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : 'Failed to add person.';
      setFormError(message);
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!displayName.trim()) {
      setFormError('Name is required.');
      return;
    }
    setFormError(null);
    mutation.mutate();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Group people</p>
          <p className="text-sm font-semibold text-slate-800">{groupName}</p>
        </div>
        {!hasSupabaseEnv ? (
          <p className="text-sm text-amber-600">Connect Supabase to load group members.</p>
        ) : null}
        {error ? <p className="text-sm text-rose-600">{String(error)}</p> : null}
        {isLoading ? <p className="text-sm text-slate-500">Loading people...</p> : null}
        {people && people.length > 0 ? (
          <ul className="space-y-2">
            {people.map((person) => (
              <li
                key={person.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-700">{person.display_name}</p>
                  {person.email ? <p className="text-xs text-slate-500">{person.email}</p> : null}
                </div>
                <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {person.user_id ? 'Claimed' : 'Unclaimed'}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {people && people.length === 0 && !isLoading ? (
          <p className="text-sm text-slate-500">No people added yet.</p>
        ) : null}
        <form className="space-y-2" onSubmit={handleSubmit}>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Name"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email (optional)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
          <button
            type="submit"
            disabled={mutation.isPending || !displayName.trim() || !hasSupabaseEnv}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {mutation.isPending ? 'Adding...' : 'Add person'}
          </button>
        </form>
      </div>
    </section>
  );
}
