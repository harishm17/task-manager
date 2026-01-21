import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type GroupPerson = {
  id: string;
  group_id: string;
  user_id: string | null;
  is_archived: boolean;
};

type SplitRow = {
  id: string;
  expense_id: string;
  amount_owed_cents: number;
};

type SettlementRow = {
  id: string;
  from_person_id: string;
  to_person_id: string;
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

  const { groupId, sourcePersonId, targetPersonId } = await req.json().catch(() => ({}));
  if (!groupId || !sourcePersonId || !targetPersonId) {
    return jsonResponse({ error: 'groupId, sourcePersonId, targetPersonId are required' }, 400);
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

  const { data: adminRow, error: adminError } = await supabaseAdmin
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (adminError || !adminRow) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  if (sourcePersonId === targetPersonId) {
    return jsonResponse({ error: 'Source and target must differ' }, 400);
  }

  const { data: people, error: peopleError } = await supabaseAdmin
    .from('group_people')
    .select('id, group_id, user_id, is_archived')
    .in('id', [sourcePersonId, targetPersonId]);

  if (peopleError || !people || people.length !== 2) {
    return jsonResponse({ error: 'People not found' }, 404);
  }

  const source = people.find((person) => person.id === sourcePersonId) as GroupPerson;
  const target = people.find((person) => person.id === targetPersonId) as GroupPerson;

  if (!source || !target) {
    return jsonResponse({ error: 'People not found' }, 404);
  }

  if (source.group_id !== groupId || target.group_id !== groupId) {
    return jsonResponse({ error: 'People must belong to the same group' }, 400);
  }

  if (source.is_archived) {
    return jsonResponse({ error: 'Source already archived' }, 400);
  }

  if (source.user_id) {
    return jsonResponse({ error: 'Source must be unclaimed' }, 400);
  }

  if (!target.user_id) {
    return jsonResponse({ error: 'Target must be claimed' }, 400);
  }

  const countRows = async (table: string, column: string, value: string) => {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select(column, { count: 'exact', head: true })
      .eq(column, value);
    if (error) return 0;
    return count ?? 0;
  };

  const counts = {
    tasks: await countRows('tasks', 'assigned_to_person_id', sourcePersonId),
    recurring_tasks: await countRows('recurring_tasks', 'assigned_to_person_id', sourcePersonId),
    expenses: await countRows('expenses', 'paid_by_person_id', sourcePersonId),
    splits: await countRows('expense_splits', 'person_id', sourcePersonId),
    settlements_from: await countRows('settlements', 'from_person_id', sourcePersonId),
    settlements_to: await countRows('settlements', 'to_person_id', sourcePersonId),
  };

  await supabaseAdmin
    .from('tasks')
    .update({ assigned_to_person_id: targetPersonId })
    .eq('assigned_to_person_id', sourcePersonId);

  await supabaseAdmin
    .from('recurring_tasks')
    .update({ assigned_to_person_id: targetPersonId })
    .eq('assigned_to_person_id', sourcePersonId);

  await supabaseAdmin
    .from('expenses')
    .update({ paid_by_person_id: targetPersonId })
    .eq('paid_by_person_id', sourcePersonId);

  const { data: sourceSplits } = await supabaseAdmin
    .from('expense_splits')
    .select('id, expense_id, amount_owed_cents')
    .eq('person_id', sourcePersonId);

  const { data: targetSplits } = await supabaseAdmin
    .from('expense_splits')
    .select('id, expense_id, amount_owed_cents')
    .eq('person_id', targetPersonId);

  const targetByExpense = new Map<string, SplitRow>();
  (targetSplits ?? []).forEach((split: SplitRow) => targetByExpense.set(split.expense_id, split));

  let splitMerged = 0;
  let splitMoved = 0;

  for (const split of sourceSplits ?? []) {
    const existing = targetByExpense.get(split.expense_id);
    if (existing) {
      splitMerged += 1;
      await supabaseAdmin
        .from('expense_splits')
        .update({ amount_owed_cents: existing.amount_owed_cents + split.amount_owed_cents })
        .eq('id', existing.id);
      await supabaseAdmin.from('expense_splits').delete().eq('id', split.id);
    } else {
      splitMoved += 1;
      await supabaseAdmin
        .from('expense_splits')
        .update({ person_id: targetPersonId })
        .eq('id', split.id);
    }
  }

  const { data: settlements } = await supabaseAdmin
    .from('settlements')
    .select('id, from_person_id, to_person_id')
    .eq('group_id', groupId)
    .or(`from_person_id.eq.${sourcePersonId},to_person_id.eq.${sourcePersonId}`);

  let settlementMoved = 0;
  let settlementRemoved = 0;

  for (const settlement of (settlements ?? []) as SettlementRow[]) {
    const newFrom = settlement.from_person_id === sourcePersonId ? targetPersonId : settlement.from_person_id;
    const newTo = settlement.to_person_id === sourcePersonId ? targetPersonId : settlement.to_person_id;

    if (newFrom === newTo) {
      settlementRemoved += 1;
      await supabaseAdmin.from('settlements').delete().eq('id', settlement.id);
    } else {
      settlementMoved += 1;
      await supabaseAdmin
        .from('settlements')
        .update({ from_person_id: newFrom, to_person_id: newTo })
        .eq('id', settlement.id);
    }
  }

  await supabaseAdmin
    .from('group_people')
    .update({ is_archived: true, archived_at: new Date().toISOString(), archived_by: user.id })
    .eq('id', sourcePersonId);

  await supabaseAdmin.from('people_merge_audit').insert({
    group_id: groupId,
    source_person_id: sourcePersonId,
    target_person_id: targetPersonId,
    merged_by: user.id,
    moved_counts: {
      tasks: counts.tasks,
      recurring_tasks: counts.recurring_tasks,
      expenses: counts.expenses,
      splits: counts.splits,
      settlements: counts.settlements_from + counts.settlements_to,
      splits_merged: splitMerged,
      splits_moved: splitMoved,
      settlements_moved: settlementMoved,
      settlements_removed: settlementRemoved,
    },
  });

  return jsonResponse({ success: true });
});
