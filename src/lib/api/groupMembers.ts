import { supabase } from '../supabaseClient';

export type GroupRole = 'admin' | 'member';
export type GroupMember = {
  user_id: string;
  role: GroupRole;
};

export async function fetchGroupRole(params: { groupId: string; userId: string }): Promise<GroupRole | null> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { groupId, userId } = params;
  const { data, error } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.role as GroupRole | undefined) ?? null;
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('group_members')
    .select('user_id, role')
    .eq('group_id', groupId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as GroupMember[];
}

export async function leaveGroup(params: { groupId: string; userId: string }): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { groupId, userId } = params;
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateGroupMemberRole(params: {
  groupId: string;
  userId: string;
  role: GroupRole;
}): Promise<GroupMember> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { groupId, userId, role } = params;
  const { data, error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select('user_id, role')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update role.');
  }

  return data as GroupMember;
}
