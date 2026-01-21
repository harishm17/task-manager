import { supabase } from '../supabaseClient';
import type { RecurringFrequency } from '../recurring';
import type { SplitMethod } from './expenses';

export type RecurringExpense = {
  id: string;
  group_id: string;
  description: string;
  amount_cents: number;
  currency: string;
  category_id: string | null;
  paid_by_person_id: string;
  split_method: SplitMethod;
  participant_ids: string[];
  split_values: Record<string, number> | null;
  adjustment_from_person_id: string | null;
  frequency: RecurringFrequency;
  interval: number;
  next_occurrence: string;
  end_date: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
};

export async function fetchRecurringExpenses(groupId: string): Promise<RecurringExpense[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('recurring_expenses')
    .select(
      `id, group_id, description, amount_cents, currency, category_id, paid_by_person_id,
       split_method, participant_ids, split_values, adjustment_from_person_id,
       frequency, interval, next_occurrence, end_date, is_active, created_by, created_at`
    )
    .eq('group_id', groupId)
    .order('next_occurrence', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RecurringExpense[];
}

export async function createRecurringExpense(params: {
  groupId: string;
  description: string;
  amountCents: number;
  currency: string;
  categoryId?: string | null;
  paidByPersonId: string;
  splitMethod: SplitMethod;
  participantIds?: string[];
  splitValues?: Record<string, number> | null;
  adjustmentFromPersonId?: string | null;
  frequency: RecurringFrequency;
  interval: number;
  nextOccurrence: string;
  endDate?: string | null;
  createdBy: string;
}): Promise<RecurringExpense> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const {
    groupId,
    description,
    amountCents,
    currency,
    categoryId,
    paidByPersonId,
    splitMethod,
    participantIds = [],
    splitValues,
    adjustmentFromPersonId,
    frequency,
    interval,
    nextOccurrence,
    endDate,
    createdBy,
  } = params;

  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({
      group_id: groupId,
      description,
      amount_cents: amountCents,
      currency,
      category_id: categoryId ?? null,
      paid_by_person_id: paidByPersonId,
      split_method: splitMethod,
      participant_ids: participantIds,
      split_values: splitValues ?? null,
      adjustment_from_person_id: adjustmentFromPersonId ?? null,
      frequency,
      interval,
      next_occurrence: nextOccurrence,
      end_date: endDate ?? null,
      is_active: true,
      created_by: createdBy,
    })
    .select(
      `id, group_id, description, amount_cents, currency, category_id, paid_by_person_id,
       split_method, participant_ids, split_values, adjustment_from_person_id,
       frequency, interval, next_occurrence, end_date, is_active, created_by, created_at`
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create recurring expense.');
  }

  return data as RecurringExpense;
}

export async function updateRecurringExpense(params: {
  recurringExpenseId: string;
  updates: Partial<Pick<RecurringExpense, 'next_occurrence' | 'end_date' | 'is_active'>>;
}): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { recurringExpenseId, updates } = params;
  const { error } = await supabase
    .from('recurring_expenses')
    .update(updates)
    .eq('id', recurringExpenseId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteRecurringExpense(recurringExpenseId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { error } = await supabase.from('recurring_expenses').delete().eq('id', recurringExpenseId);
  if (error) {
    throw new Error(error.message);
  }
}
