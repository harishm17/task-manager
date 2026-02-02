import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { ExportPanel } from '../components/ExportPanel';
import { GroupMembersPanel } from '../components/GroupMembersPanel';
import { GroupSettingsPanel } from '../components/GroupSettingsPanel';
import { GroupPeoplePanel } from '../components/GroupPeoplePanel';
import { InvitePanel } from '../components/InvitePanel';
import { MergePeoplePanel } from '../components/MergePeoplePanel';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../contexts/GroupContext';
import { fetchUserProfile, updateUserProfile } from '../lib/api/users';
import { hasSupabaseEnv } from '../lib/supabaseClient';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { activeGroup, groups } = useGroups();
  const queryClient = useQueryClient();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchUserProfile(user?.id ?? ''),
    enabled: Boolean(user?.id && hasSupabaseEnv),
  });

  // Initialize form fields from profile data once
  const hasInitializedProfile = useRef(false);
  useEffect(() => {
    if (!hasInitializedProfile.current && profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(profile.name ?? '');
       
      setAvatarUrl(profile.avatar_url ?? '');
      hasInitializedProfile.current = true;
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Missing user session.');
      }
      return updateUserProfile(user.id, {
        name: displayName.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setProfileSuccess('Profile updated.');
      setProfileError(null);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : 'Failed to update profile.';
      setProfileError(message);
      setProfileSuccess(null);
    },
  });

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    const result = await signOut();
    if (result.error) {
      setSignOutError(result.error);
    }
    setSigningOut(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage profile and group preferences." />
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Profile</p>
            <p className="text-sm text-slate-600">Update your display name and avatar URL.</p>
          </div>
          {profileLoading ? <p className="text-sm text-slate-500">Loading profile...</p> : null}
          {profileError ? <p className="text-sm text-rose-600">{profileError}</p> : null}
          {profileSuccess ? <p className="text-sm text-emerald-600">{profileSuccess}</p> : null}
          {!hasSupabaseEnv ? (
            <p className="text-xs text-amber-600">Set Supabase env vars to edit your profile.</p>
          ) : null}
          <form
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setProfileSuccess(null);
              setProfileError(null);
              updateProfileMutation.mutate();
            }}
          >
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Display name"
              aria-label="Display name"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <input
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="Avatar URL (optional)"
              aria-label="Avatar URL"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!hasSupabaseEnv || updateProfileMutation.isPending}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Signed in as</p>
            <p className="text-sm font-semibold text-slate-800">{user?.email ?? 'Unknown'}</p>
          </div>
          {signOutError ? <p className="text-sm text-rose-600">{signOutError}</p> : null}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Active group</p>
            <p className="text-sm font-semibold text-slate-800">
              {activeGroup ? `${activeGroup.name} (${activeGroup.type})` : 'None'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">All groups</p>
            <div className="flex flex-wrap gap-2">
              {groups.length === 0 ? (
                <span className="text-sm text-slate-500">No groups yet.</span>
              ) : (
                groups.map((group) => (
                  <span
                    key={group.id}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    {group.name}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
      {activeGroup ? (
        <GroupSettingsPanel
          groupId={activeGroup.id}
          groupName={activeGroup.name}
          groupType={activeGroup.type}
        />
      ) : null}
      {activeGroup && activeGroup.type === 'household' ? (
        <GroupMembersPanel groupId={activeGroup.id} groupName={activeGroup.name} />
      ) : null}
      {activeGroup ? (
        <ExportPanel
          groupId={activeGroup.id}
          groupName={activeGroup.name}
          currency={activeGroup.default_currency}
          groupType={activeGroup.type}
        />
      ) : null}
      {activeGroup && activeGroup.type === 'household' ? (
        <GroupPeoplePanel groupId={activeGroup.id} groupName={activeGroup.name} />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Select a household group to manage people.</p>
        </section>
      )}
      {activeGroup && activeGroup.type === 'household' ? (
        <InvitePanel groupId={activeGroup.id} groupName={activeGroup.name} />
      ) : null}
      {activeGroup && activeGroup.type === 'household' ? (
        <MergePeoplePanel groupId={activeGroup.id} groupName={activeGroup.name} />
      ) : null}
    </div>
  );
}
