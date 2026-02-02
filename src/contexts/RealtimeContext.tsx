/**
 * Realtime Context
 * Manages Supabase Realtime subscriptions for the current group
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useGroupContext } from './GroupContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

interface RealtimeContextValue {
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { currentGroup } = useGroupContext();

  // Subscribe to expenses for current group
  useRealtimeSubscription({
    table: 'expenses',
    filter: currentGroup ? `group_id=eq.${currentGroup.id}` : undefined,
    enabled: !!currentGroup,
  });

  // Subscribe to expense splits for current group
  useRealtimeSubscription({
    table: 'expense_splits',
    enabled: !!currentGroup,
  });

  // Subscribe to tasks for current group
  useRealtimeSubscription({
    table: 'tasks',
    filter: currentGroup ? `group_id=eq.${currentGroup.id}` : undefined,
    enabled: !!currentGroup,
  });

  // Subscribe to settlements for current group
  useRealtimeSubscription({
    table: 'settlements',
    filter: currentGroup ? `group_id=eq.${currentGroup.id}` : undefined,
    enabled: !!currentGroup,
  });

  // Subscribe to people in current group
  useRealtimeSubscription({
    table: 'people',
    filter: currentGroup ? `group_id=eq.${currentGroup.id}` : undefined,
    enabled: !!currentGroup,
  });

  // Subscribe to group updates
  useRealtimeSubscription({
    table: 'groups',
    filter: currentGroup ? `id=eq.${currentGroup.id}` : undefined,
    enabled: !!currentGroup,
  });

  const value: RealtimeContextValue = {
    isConnected: !!currentGroup,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
}
