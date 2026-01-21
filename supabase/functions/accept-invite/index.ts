import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type Invite = {
  id: string;
  group_id: string;
  email: string | null;
  status: 'pending' | 'accepted' | 'declined';
  expires_at: string;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse({}, 200);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== 'string') {
    return jsonResponse({ error: 'Token is required' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) {
    return jsonResponse({ error: 'Missing auth token' }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const supabaseUser = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('invitations')
    .select('id, group_id, email, status, expires_at')
    .eq('token', token)
    .single();

  if (inviteError || !invite) {
    return jsonResponse({ error: 'Invite not found' }, 404);
  }

  const inviteRow = invite as Invite;
  if (inviteRow.status !== 'pending') {
    return jsonResponse({ error: 'Invite already used' }, 400);
  }

  if (new Date(inviteRow.expires_at).getTime() < Date.now()) {
    return jsonResponse({ error: 'Invite expired' }, 400);
  }

  const userEmail = user.email?.toLowerCase() ?? null;
  if (inviteRow.email) {
    if (!userEmail || inviteRow.email.toLowerCase() !== userEmail) {
      return jsonResponse({ error: 'Invite email does not match account' }, 403);
    }
  }

  const { error: memberError } = await supabaseAdmin.from('group_members').upsert(
    {
      group_id: inviteRow.group_id,
      user_id: user.id,
      role: 'member',
    },
    {
      onConflict: 'group_id,user_id',
    }
  );

  if (memberError) {
    return jsonResponse({ error: memberError.message }, 500);
  }

  const { data: existingPerson } = await supabaseAdmin
    .from('group_people')
    .select('id')
    .eq('group_id', inviteRow.group_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingPerson) {
    let claimed = false;
    if (userEmail) {
      const { data: placeholder } = await supabaseAdmin
        .from('group_people')
        .select('id')
        .eq('group_id', inviteRow.group_id)
        .ilike('email', userEmail)
        .is('user_id', null)
        .maybeSingle();

      if (placeholder) {
        const { error: claimError } = await supabaseAdmin
          .from('group_people')
          .update({ user_id: user.id })
          .eq('id', placeholder.id);

        if (claimError) {
          return jsonResponse({ error: claimError.message }, 500);
        }
        claimed = true;
      }
    }

    if (!claimed) {
      const displayName =
        (user.user_metadata?.full_name as string | undefined) ||
        (userEmail ? userEmail.split('@')[0] : 'New member');

      const { error: insertError } = await supabaseAdmin.from('group_people').insert({
        group_id: inviteRow.group_id,
        user_id: user.id,
        display_name: displayName,
        email: userEmail,
        created_by: user.id,
      });

      if (insertError) {
        return jsonResponse({ error: insertError.message }, 500);
      }
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', inviteRow.id);

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  return jsonResponse({ groupId: inviteRow.group_id });
});
