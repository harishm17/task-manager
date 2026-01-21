import { supabase } from '../supabaseClient';

export type BalanceExpense = {
  id: string;
  paid_by_person_id: string;
};

export type BalanceSplit = {
  expense_id: string;
  person_id: string;
  amount_owed_cents: number;
};

export type BalanceSettlement = {
  from_person_id: string;
  to_person_id: string;
  amount_cents: number;
};

export type BalancePerson = {
  id: string;
  display_name: string;
  user_id: string | null;
};

export type BalanceRow = {
  personId: string;
  displayName: string;
  userId: string | null;
  netCents: number;
};

export type PairwiseBalanceRow = BalanceRow;

export type BalanceInputs = {
  expenses: BalanceExpense[];
  splits: BalanceSplit[];
  settlements: BalanceSettlement[];
};

export function computeNetBalances(
  people: BalancePerson[],
  expenses: BalanceExpense[],
  splits: BalanceSplit[],
  settlements: BalanceSettlement[]
): BalanceRow[] {
  const balances = new Map<string, BalanceRow>();

  people.forEach((person) => {
    balances.set(person.id, {
      personId: person.id,
      displayName: person.display_name,
      userId: person.user_id,
      netCents: 0,
    });
  });

  const expensePayers = new Map(expenses.map((expense) => [expense.id, expense.paid_by_person_id]));

  splits.forEach((split) => {
    const payer = expensePayers.get(split.expense_id);
    if (!payer) return;
    if (split.person_id === payer) return;

    const payerBalance = balances.get(payer);
    if (payerBalance) {
      payerBalance.netCents += split.amount_owed_cents;
    }

    const debtorBalance = balances.get(split.person_id);
    if (debtorBalance) {
      debtorBalance.netCents -= split.amount_owed_cents;
    }
  });

  settlements.forEach((settlement) => {
    const fromBalance = balances.get(settlement.from_person_id);
    if (fromBalance) {
      fromBalance.netCents += settlement.amount_cents;
    }

    const toBalance = balances.get(settlement.to_person_id);
    if (toBalance) {
      toBalance.netCents -= settlement.amount_cents;
    }
  });

  return Array.from(balances.values()).sort((a, b) => b.netCents - a.netCents);
}

export function computePairwiseBalances(params: {
  currentPersonId: string;
  people: BalancePerson[];
  expenses: BalanceExpense[];
  splits: BalanceSplit[];
  settlements: BalanceSettlement[];
}): PairwiseBalanceRow[] {
  const { currentPersonId, people, expenses, splits, settlements } = params;
  const balances = new Map<string, PairwiseBalanceRow>();

  people.forEach((person) => {
    if (person.id === currentPersonId) return;
    balances.set(person.id, {
      personId: person.id,
      displayName: person.display_name,
      userId: person.user_id,
      netCents: 0,
    });
  });

  const expensePayers = new Map(expenses.map((expense) => [expense.id, expense.paid_by_person_id]));
  const ledger = new Map<string, number>();
  const keyFor = (from: string, to: string) => `${from}:${to}`;

  const adjustLedger = (from: string, to: string, delta: number) => {
    const key = keyFor(from, to);
    ledger.set(key, (ledger.get(key) ?? 0) + delta);
  };

  splits.forEach((split) => {
    const payer = expensePayers.get(split.expense_id);
    if (!payer || split.person_id === payer) return;
    adjustLedger(split.person_id, payer, split.amount_owed_cents);
  });

  settlements.forEach((settlement) => {
    adjustLedger(settlement.from_person_id, settlement.to_person_id, -settlement.amount_cents);
  });

  balances.forEach((row, personId) => {
    const owedToCurrent = ledger.get(keyFor(personId, currentPersonId)) ?? 0;
    const owedByCurrent = ledger.get(keyFor(currentPersonId, personId)) ?? 0;
    row.netCents = owedToCurrent - owedByCurrent;
  });

  return Array.from(balances.values())
    .filter((row) => row.netCents !== 0)
    .sort((a, b) => Math.abs(b.netCents) - Math.abs(a.netCents));
}

export async function fetchBalanceInputs(groupId: string): Promise<BalanceInputs> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data: expenses, error: expenseError } = await supabase
    .from('expenses')
    .select('id, paid_by_person_id')
    .eq('group_id', groupId)
    .eq('is_deleted', false);

  if (expenseError) {
    throw new Error(expenseError.message);
  }

  const expenseIds = (expenses ?? []).map((expense) => expense.id);

  let splits: BalanceSplit[] = [];
  if (expenseIds.length > 0) {
    const { data: splitData, error: splitError } = await supabase
      .from('expense_splits')
      .select('expense_id, person_id, amount_owed_cents')
      .in('expense_id', expenseIds);

    if (splitError) {
      throw new Error(splitError.message);
    }

    splits = splitData ?? [];
  }

  const { data: settlements, error: settlementError } = await supabase
    .from('settlements')
    .select('from_person_id, to_person_id, amount_cents')
    .eq('group_id', groupId);

  if (settlementError) {
    throw new Error(settlementError.message);
  }

  return {
    expenses: expenses ?? [],
    splits,
    settlements: settlements ?? [],
  };
}
