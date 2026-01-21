import { supabase } from '../supabaseClient';

export type Settlement = {
  id: string;
  group_id: string;
  from_person_id: string;
  to_person_id: string;
  amount_cents: number;
  currency: string;
  payment_method: string | null;
  notes: string | null;
  settled_at: string;
  from_person?: { id: string; display_name: string } | null;
  to_person?: { id: string; display_name: string } | null;
};

export async function fetchSettlements(groupId: string): Promise<Settlement[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('settlements')
    .select(
      `id, group_id, from_person_id, to_person_id, amount_cents, currency, payment_method, notes, settled_at,
       from_person:group_people!settlements_from_person_id(id, display_name),
       to_person:group_people!settlements_to_person_id(id, display_name)`
    )
    .eq('group_id', groupId)
    .order('settled_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as Settlement[];
}

export async function createSettlement(params: {
  groupId: string;
  fromPersonId: string;
  toPersonId: string;
  amountCents: number;
  currency: string;
  paymentMethod?: string;
  notes?: string;
  createdBy: string;
}): Promise<Settlement> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { groupId, fromPersonId, toPersonId, amountCents, currency, paymentMethod, notes, createdBy } = params;

  const { data, error } = await supabase
    .from('settlements')
    .insert({
      group_id: groupId,
      from_person_id: fromPersonId,
      to_person_id: toPersonId,
      amount_cents: amountCents,
      currency,
      payment_method: paymentMethod || null,
      notes: notes || null,
      created_by: createdBy,
    })
    .select(
      `id, group_id, from_person_id, to_person_id, amount_cents, currency, payment_method, notes, settled_at,
       from_person:group_people!settlements_from_person_id(id, display_name),
       to_person:group_people!settlements_to_person_id(id, display_name)`
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create settlement.');
  }

  return data as unknown as Settlement;
}
