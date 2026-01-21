import { supabase } from '../supabaseClient';

export type ExpenseCategory = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

export type Expense = {
  id: string;
  group_id: string;
  description: string;
  amount_cents: number;
  currency: string;
  category_id: string | null;
  expense_date: string;
  paid_by_person_id: string;
  split_method: string;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  paid_by_person?: { id: string; display_name: string } | null;
  category?: ExpenseCategory | null;
};

export type ExpenseSplit = {
  person_id: string;
  amount_owed_cents: number;
  person?: { id: string; display_name: string } | null;
};

export type ExpenseWithSplits = Expense & {
  splits?: ExpenseSplit[];
};

export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares' | 'adjustment';

type EqualSplit = {
  personId: string;
  amountCents: number;
};

type ExactSplit = {
  personId: string;
  amountCents: number;
};

type PercentageSplit = {
  personId: string;
  percentage: number;
};

type ShareSplit = {
  personId: string;
  shares: number;
};

type RemainderSplit = {
  personId: string;
  baseCents: number;
  fraction: number;
};

export function calculateEqualSplits(amountCents: number, personIds: string[]): EqualSplit[] {
  if (personIds.length === 0) return [];

  const base = Math.floor(amountCents / personIds.length);
  let remainder = amountCents - base * personIds.length;

  return personIds.map((personId) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return { personId, amountCents: base + extra };
  });
}

const finalizeSplitAmounts = (amountCents: number, rawSplits: RemainderSplit[]): ExactSplit[] => {
  const totalBase = rawSplits.reduce((sum, split) => sum + split.baseCents, 0);
  let remainder = amountCents - totalBase;
  if (remainder < 0) remainder = 0;

  const sorted = [...rawSplits].sort((a, b) => {
    const diff = b.fraction - a.fraction;
    if (diff !== 0) return diff;
    return a.personId.localeCompare(b.personId);
  });

  const bonus = new Map<string, number>();
  for (let i = 0; i < remainder; i += 1) {
    const target = sorted[i % sorted.length];
    bonus.set(target.personId, (bonus.get(target.personId) ?? 0) + 1);
  }

  return rawSplits.map((split) => ({
    personId: split.personId,
    amountCents: split.baseCents + (bonus.get(split.personId) ?? 0),
  }));
};

export function buildExactSplits(amountCents: number, splits: ExactSplit[]): ExactSplit[] {
  if (splits.length === 0) {
    throw new Error('Select at least one person to split with.');
  }

  const seen = new Set<string>();
  const total = splits.reduce((sum, split) => {
    if (seen.has(split.personId)) {
      throw new Error('Duplicate person in split.');
    }
    if (split.amountCents < 0) {
      throw new Error('Split amounts cannot be negative.');
    }
    seen.add(split.personId);
    return sum + split.amountCents;
  }, 0);

  if (total !== amountCents) {
    throw new Error('Custom split must add up to the total amount.');
  }

  return splits;
}

export function calculatePercentageSplits(
  amountCents: number,
  splits: PercentageSplit[]
): ExactSplit[] {
  if (splits.length === 0) {
    throw new Error('Select at least one person to split with.');
  }

  const seen = new Set<string>();
  let totalPercent = 0;

  const sanitized = splits.map((split) => {
    if (seen.has(split.personId)) {
      throw new Error('Duplicate person in split.');
    }
    if (split.percentage < 0) {
      throw new Error('Percentages cannot be negative.');
    }
    seen.add(split.personId);
    totalPercent += split.percentage;
    return split;
  });

  if (Math.abs(totalPercent - 100) > 0.001) {
    throw new Error('Percentages must add up to 100.');
  }

  const rawSplits = sanitized.map((split) => {
    const rawAmount = (amountCents * split.percentage) / 100;
    return {
      personId: split.personId,
      baseCents: Math.floor(rawAmount),
      fraction: rawAmount - Math.floor(rawAmount),
    };
  });

  return finalizeSplitAmounts(amountCents, rawSplits);
}

export function calculateShareSplits(amountCents: number, splits: ShareSplit[]): ExactSplit[] {
  if (splits.length === 0) {
    throw new Error('Select at least one person to split with.');
  }

  const seen = new Set<string>();
  let totalShares = 0;

  const sanitized = splits.map((split) => {
    if (seen.has(split.personId)) {
      throw new Error('Duplicate person in split.');
    }
    if (split.shares < 0) {
      throw new Error('Shares cannot be negative.');
    }
    seen.add(split.personId);
    totalShares += split.shares;
    return split;
  });

  if (totalShares <= 0) {
    throw new Error('Enter at least one share.');
  }

  const rawSplits = sanitized.map((split) => {
    const rawAmount = (amountCents * split.shares) / totalShares;
    return {
      personId: split.personId,
      baseCents: Math.floor(rawAmount),
      fraction: rawAmount - Math.floor(rawAmount),
    };
  });

  return finalizeSplitAmounts(amountCents, rawSplits);
}

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('expense_categories')
    .select('id, name, icon, color')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ExpenseCategory[];
}

export async function fetchExpenses(groupId: string): Promise<Expense[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('expenses')
    .select(
      `id, group_id, description, amount_cents, currency, category_id, expense_date, paid_by_person_id, split_method, receipt_url, notes, created_at,
       paid_by_person:group_people!expenses_paid_by_person_id(id, display_name),
       category:expense_categories(id, name, icon, color)`
    )
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('expense_date', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as Expense[];
}

export async function fetchExpensesWithSplits(groupId: string): Promise<ExpenseWithSplits[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('expenses')
    .select(
      `id, group_id, description, amount_cents, currency, category_id, expense_date, paid_by_person_id, split_method, receipt_url, notes, created_at,
       paid_by_person:group_people!expenses_paid_by_person_id(id, display_name),
       category:expense_categories(id, name, icon, color),
       splits:expense_splits(person_id, amount_owed_cents, person:group_people(id, display_name))`
    )
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('expense_date', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ExpenseWithSplits[];
}

export async function fetchExpenseSplits(expenseId: string): Promise<ExpenseSplit[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('expense_splits')
    .select('person_id, amount_owed_cents, person:group_people(id, display_name)')
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ExpenseSplit[];
}

export async function createExpenseWithSplits(params: {
  groupId: string;
  description: string;
  amountCents: number;
  currency: string;
  categoryId?: string | null;
  expenseDate: string;
  paidByPersonId: string;
  notes?: string | null;
  participantIds?: string[];
  exactSplits?: ExactSplit[];
  splitMethod?: SplitMethod;
  createdBy: string;
}): Promise<Expense> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const {
    groupId,
    description,
    amountCents,
    currency,
    categoryId,
    expenseDate,
    paidByPersonId,
    notes,
    participantIds = [],
    exactSplits = [],
    splitMethod = 'equal',
    createdBy,
  } = params;

  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      group_id: groupId,
      description,
      amount_cents: amountCents,
      currency,
      category_id: categoryId ?? null,
      expense_date: expenseDate,
      paid_by_person_id: paidByPersonId,
      split_method: splitMethod,
      notes: notes ?? null,
      created_by: createdBy,
    })
    .select(
      `id, group_id, description, amount_cents, currency, category_id, expense_date, paid_by_person_id, split_method, receipt_url, notes, created_at,
       paid_by_person:group_people!expenses_paid_by_person_id(id, display_name),
       category:expense_categories(id, name, icon, color)`
    )
    .single();

  if (expenseError || !expense) {
    throw new Error(expenseError?.message ?? 'Failed to create expense.');
  }

  const splitRows =
    splitMethod === 'equal'
      ? calculateEqualSplits(amountCents, participantIds)
      : buildExactSplits(amountCents, exactSplits);

  const splits = splitRows.map((split) => ({
    expense_id: expense.id,
    person_id: split.personId,
    amount_owed_cents: split.amountCents,
  }));

  const { error: splitError } = await supabase.from('expense_splits').insert(splits);

  if (splitError) {
    await supabase.from('expenses').delete().eq('id', expense.id);
    throw new Error(splitError.message);
  }

  return expense as unknown as Expense;
}

export async function updateExpenseWithSplits(params: {
  expenseId: string;
  description: string;
  amountCents: number;
  currency: string;
  categoryId?: string | null;
  expenseDate: string;
  paidByPersonId: string;
  notes?: string | null;
  participantIds?: string[];
  exactSplits?: ExactSplit[];
  splitMethod?: SplitMethod;
}): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const {
    expenseId,
    description,
    amountCents,
    currency,
    categoryId,
    expenseDate,
    paidByPersonId,
    notes,
    participantIds = [],
    exactSplits = [],
    splitMethod = 'equal',
  } = params;

  const { error: expenseError } = await supabase
    .from('expenses')
    .update({
      description,
      amount_cents: amountCents,
      currency,
      category_id: categoryId ?? null,
      expense_date: expenseDate,
      paid_by_person_id: paidByPersonId,
      split_method: splitMethod,
      notes: notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId);

  if (expenseError) {
    throw new Error(expenseError.message);
  }

  const { error: deleteError } = await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const splitRows =
    splitMethod === 'equal'
      ? calculateEqualSplits(amountCents, participantIds)
      : buildExactSplits(amountCents, exactSplits);

  if (splitRows.length === 0) {
    throw new Error('Select at least one person to split with.');
  }

  const splits = splitRows.map((split) => ({
    expense_id: expenseId,
    person_id: split.personId,
    amount_owed_cents: split.amountCents,
  }));

  const { error: splitError } = await supabase.from('expense_splits').insert(splits);
  if (splitError) {
    throw new Error(splitError.message);
  }
}

export async function deleteExpense(expenseId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { error } = await supabase.from('expenses').update({ is_deleted: true }).eq('id', expenseId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadExpenseReceipt(params: {
  groupId: string;
  expenseId: string;
  file: File;
}): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { groupId, expenseId, file } = params;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${groupId}/${expenseId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, file, {
    upsert: true,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error('Failed to generate receipt URL.');
  }

  return data.publicUrl;
}

export async function updateExpenseReceipt(params: {
  expenseId: string;
  receiptUrl: string | null;
}): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { expenseId, receiptUrl } = params;
  const { error } = await supabase
    .from('expenses')
    .update({ receipt_url: receiptUrl, updated_at: new Date().toISOString() })
    .eq('id', expenseId);

  if (error) {
    throw new Error(error.message);
  }
}
