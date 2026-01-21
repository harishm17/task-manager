import { supabase } from '../supabaseClient';

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
};

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, avatar_url')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to fetch profile.');
  }

  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: { name?: string | null; avatarUrl?: string | null }
): Promise<UserProfile> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { name, avatarUrl } = updates;

  const { data, error } = await supabase
    .from('users')
    .update({
      name: name ?? null,
      avatar_url: avatarUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id, email, name, avatar_url')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update profile.');
  }

  return data;
}
