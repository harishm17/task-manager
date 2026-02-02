import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isTest } from '../config/env';

export const hasSupabaseEnv = Boolean(env.supabase.url && env.supabase.anonKey);

/**
 * Supabase client instance
 * Configured with persistent sessions and auto token refresh
 */
export const supabase: SupabaseClient = createClient(
  env.supabase.url,
  env.supabase.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: isTest ? undefined : window.localStorage,
    },
  }
);
