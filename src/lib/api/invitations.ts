import { supabase } from '../supabaseClient';

export type Invitation = {
  id: string;
  group_id: string;
  email: string | null;
  token: string;
  status: 'pending' | 'accepted' | 'declined';
  expires_at: string;
  created_at: string;
};

export async function fetchInvitations(groupId: string): Promise<Invitation[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('invitations')
    .select('id, group_id, email, token, status, expires_at, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createInvitation(params: {
  groupId: string;
  email?: string;
  invitedBy: string;
  expiresInDays?: number;
}): Promise<Invitation> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { groupId, email, invitedBy, expiresInDays = 7 } = params;
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      group_id: groupId,
      email: email || null,
      invited_by: invitedBy,
      token,
      expires_at: expiresAt,
    })
    .select('id, group_id, email, token, status, expires_at, created_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create invitation.');
  }

  return data;
}

export async function acceptInvitation(token: string): Promise<{ groupId: string }>
{
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase.functions.invoke('accept-invite', {
    body: { token },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.groupId) {
    throw new Error('Invite acceptance failed.');
  }

  return { groupId: data.groupId as string };
}
