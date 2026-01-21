import { supabase } from '../supabaseClient';

export type GroupPerson = {
  id: string;
  group_id: string;
  user_id: string | null;
  display_name: string;
  email: string | null;
  created_at: string;
  is_archived: boolean;
};

export async function fetchGroupPeople(groupId: string): Promise<GroupPerson[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('group_people')
    .select('id, group_id, user_id, display_name, email, created_at, is_archived')
    .eq('group_id', groupId)
    .eq('is_archived', false)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createGroupPerson(params: {
  groupId: string;
  displayName: string;
  email?: string;
  createdBy: string;
}): Promise<GroupPerson> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { groupId, displayName, email, createdBy } = params;

  const { data, error } = await supabase
    .from('group_people')
    .insert({
      group_id: groupId,
      display_name: displayName,
      email: email || null,
      created_by: createdBy,
    })
    .select('id, group_id, user_id, display_name, email, created_at, is_archived')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to add person.');
  }

  return data;
}
