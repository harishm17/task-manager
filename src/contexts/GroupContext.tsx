import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createHouseholdGroup as createHouseholdGroupApi,
  createPersonalGroup,
  fetchGroups,
} from '../lib/api/groups';
import { hasSupabaseEnv } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

export type GroupType = 'personal' | 'household';

export type Group = {
  id: string;
  name: string;
  type: GroupType;
  default_currency: string;
  created_at?: string;
};

type GroupContextValue = {
  groups: Group[];
  activeGroup: Group | null;
  loading: boolean;
  error: string | null;
  setActiveGroupId: (groupId: string) => void;
  refreshGroups: () => Promise<void>;
  createHouseholdGroup: (name: string) => Promise<{ error: string | null; group: Group | null }>;
};

const GROUP_STORAGE_KEY = 'divvydo.activeGroupId';
const GroupContext = createContext<GroupContextValue | undefined>(undefined);

const sortGroups = (groups: Group[]) => {
  return [...groups].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'personal' ? -1 : 1;
    }
    return (a.created_at ?? '').localeCompare(b.created_at ?? '');
  });
};

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(GROUP_STORAGE_KEY);
  });

  const setActiveGroupId = useCallback((groupId: string) => {
    setActiveGroupIdState(groupId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(GROUP_STORAGE_KEY, groupId);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    if (!user || !hasSupabaseEnv) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data = await fetchGroups();
      const hasPersonal = data.some((group) => group.type === 'personal');

      if (!hasPersonal) {
        await createPersonalGroup({
          userEmail: user.email ?? null,
        });
        data = await fetchGroups();
      }

      const sortedGroups = sortGroups(data ?? []);
      setGroups(sortedGroups);
      setLoading(false);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load groups.';
      setError(message);
      setGroups([]);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (groups.length === 0) {
      setActiveGroupIdState(null);
      return;
    }
    const hasActive = activeGroupId && groups.some((group) => group.id === activeGroupId);
    if (!hasActive) {
      setActiveGroupId(groups[0].id);
    }
  }, [groups, activeGroupId, setActiveGroupId]);

  const activeGroup = useMemo(() => {
    if (!activeGroupId) return null;
    return groups.find((group) => group.id === activeGroupId) ?? null;
  }, [groups, activeGroupId]);

  const createHouseholdGroup = useCallback(
    async (name: string) => {
      if (!user || !hasSupabaseEnv) {
        return { error: 'Missing user session or Supabase config.', group: null };
      }

      try {
        const group = await createHouseholdGroupApi({
          name,
          userEmail: user.email ?? null,
        });
        await loadGroups();
        setActiveGroupId(group.id);
        return { error: null, group };
      } catch (createError) {
        const message = createError instanceof Error ? createError.message : 'Failed to create group.';
        return { error: message, group: null };
      }
    },
    [loadGroups, setActiveGroupId, user]
  );

  const value = useMemo(
    () => ({
      groups,
      activeGroup,
      loading,
      error,
      setActiveGroupId,
      refreshGroups: loadGroups,
      createHouseholdGroup,
    }),
    [groups, activeGroup, loading, error, setActiveGroupId, loadGroups, createHouseholdGroup]
  );

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroups() {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroups must be used within GroupProvider');
  }
  return context;
}
