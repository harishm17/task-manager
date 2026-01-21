import type { Group } from '../../contexts/GroupContext';
import { supabase } from '../supabaseClient';

export async function fetchGroups(): Promise<Group[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('groups')
    .select('id, name, type, default_currency, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createHouseholdGroup(params: {
  name: string;
  userEmail: string | null;
  displayName?: string;
}): Promise<Group> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { name, userEmail, displayName } = params;
  const { data: group, error: groupError } = await supabase
    .rpc('create_household_group', {
      p_name: name,
      p_display_name: displayName ?? null,
      p_email: userEmail ?? null,
    })
    .select('id, name, type, default_currency, created_at')
    .single();

  if (groupError || !group) {
    throw new Error(groupError?.message ?? 'Failed to create group.');
  }

  return group;
}

export async function createPersonalGroup(params: {
  userEmail: string | null;
  displayName?: string;
}): Promise<Group> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { userEmail, displayName } = params;
  const { data: group, error: groupError } = await supabase
    .rpc('create_personal_group', {
      p_display_name: displayName ?? null,
      p_email: userEmail ?? null,
    })
    .select('id, name, type, default_currency, created_at')
    .single();

  if (groupError || !group) {
    throw new Error(groupError?.message ?? 'Failed to create personal group.');
  }

  return group;
}

export async function updateGroupName(params: { groupId: string; name: string }): Promise<Group> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { groupId, name } = params;
  const { data, error } = await supabase
    .from('groups')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .select('id, name, type, default_currency, created_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update group.');
  }

  return data;
}

export async function deleteGroup(groupId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { error } = await supabase.from('groups').delete().eq('id', groupId);

  if (error) {
    throw new Error(error.message);
  }
}
