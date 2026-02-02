/**
 * Real-time Subscription Hook
 * Subscribes to Supabase Realtime changes for tables
 */

import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  enabled?: boolean;
}

export function useRealtimeSubscription({
  table,
  filter,
  event = '*',
  enabled = true,
}: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Create channel name
    const channelName = `realtime:${table}${filter ? `:${filter}` : ''}`;

    // Subscribe to changes
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        (payload) => {
          console.log(`[Realtime] ${table} ${payload.eventType}:`, payload);

          // Invalidate relevant queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: [table] });

          // Also invalidate common related queries
          if (table === 'expenses' || table === 'expense_splits') {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['balances'] });
          }

          if (table === 'tasks') {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
          }

          if (table === 'settlements') {
            queryClient.invalidateQueries({ queryKey: ['balances'] });
            queryClient.invalidateQueries({ queryKey: ['settlements'] });
          }

          if (table === 'people') {
            queryClient.invalidateQueries({ queryKey: ['people'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${channelName} status:`, status);
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      console.log(`[Realtime] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [table, filter, event, enabled, queryClient]);

  return channelRef.current;
}
