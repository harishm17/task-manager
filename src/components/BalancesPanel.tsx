import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { hasSupabaseEnv } from '../lib/supabaseClient';
import { fetchGroupPeople } from '../lib/api/groupPeople';
import { computeNetBalances, computePairwiseBalances, fetchBalanceInputs } from '../lib/api/balances';
import { fetchExpenses } from '../lib/api/expenses';
import { createSettlement, fetchSettlements } from '../lib/api/settlements';

type BalancesPanelProps = {
  groupId: string;
  groupName: string;
  currency: string;
};

export function BalancesPanel({ groupId, groupName, currency }: BalancesPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [settleTo, setSettleTo] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedPeople, setExpandedPeople] = useState<string[]>([]);

  const { data: people = [], isLoading: peopleLoading } = useQuery({
    queryKey: ['group-people', groupId],
    queryFn: () => fetchGroupPeople(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const { data: balanceInputs, isLoading: balanceLoading } = useQuery({
    queryKey: ['balances', groupId],
    queryFn: () => fetchBalanceInputs(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: () => fetchExpenses(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const { data: settlements = [] } = useQuery({
    queryKey: ['settlements', groupId],
    queryFn: () => fetchSettlements(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const balances = useMemo(() => {
    if (!balanceInputs) return [];
    return computeNetBalances(people, balanceInputs.expenses, balanceInputs.splits, balanceInputs.settlements);
  }, [people, balanceInputs]);

  const currentPerson = people.find((person) => person.user_id === user?.id) ?? null;
  const currentBalance = balances.find((row) => row.personId === currentPerson?.id)?.netCents ?? 0;

  const amountFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }),
    [currency]
  );

  const pairwiseBalances = useMemo(() => {
    if (!balanceInputs || !currentPerson) return [];
    return computePairwiseBalances({
      currentPersonId: currentPerson.id,
      people,
      expenses: balanceInputs.expenses,
      splits: balanceInputs.splits,
      settlements: balanceInputs.settlements,
    });
  }, [balanceInputs, currentPerson, people]);

  const youOwe = pairwiseBalances.filter((row) => row.netCents < 0);
  const youAreOwed = pairwiseBalances.filter((row) => row.netCents > 0);

  const contributionsByPerson = useMemo(() => {
    const map = new Map<
      string,
      Array<{ id: string; label: string; date: string | null; amountCents: number; kind: 'expense' | 'settlement' }>
    >();
    if (!balanceInputs || !currentPerson) return map;

    const expenseById = new Map(expenses.map((expense) => [expense.id, expense]));
    const expensePayers = new Map(balanceInputs.expenses.map((expense) => [expense.id, expense.paid_by_person_id]));

    const addEntry = (
      personId: string,
      entry: { id: string; label: string; date: string | null; amountCents: number; kind: 'expense' | 'settlement' }
    ) => {
      if (!map.has(personId)) {
        map.set(personId, []);
      }
      map.get(personId)?.push(entry);
    };

    balanceInputs.splits.forEach((split) => {
      const payer = expensePayers.get(split.expense_id);
      if (!payer || split.person_id === payer) return;

      const expense = expenseById.get(split.expense_id);
      const label = expense ? expense.description : 'Expense';
      const date = expense?.expense_date ?? null;

      if (payer === currentPerson.id && split.person_id !== currentPerson.id) {
        addEntry(split.person_id, {
          id: `expense-${split.expense_id}-${split.person_id}`,
          label,
          date,
          amountCents: split.amount_owed_cents,
          kind: 'expense',
        });
      } else if (split.person_id === currentPerson.id && payer !== currentPerson.id) {
        addEntry(payer, {
          id: `expense-${split.expense_id}-${split.person_id}`,
          label,
          date,
          amountCents: -split.amount_owed_cents,
          kind: 'expense',
        });
      }
    });

    settlements.forEach((settlement) => {
      const date = settlement.settled_at.slice(0, 10);
      const label = settlement.payment_method ? `Settlement · ${settlement.payment_method}` : 'Settlement';

      if (settlement.from_person_id === currentPerson.id && settlement.to_person_id !== currentPerson.id) {
        addEntry(settlement.to_person_id, {
          id: `settlement-${settlement.id}`,
          label,
          date,
          amountCents: settlement.amount_cents,
          kind: 'settlement',
        });
      } else if (settlement.to_person_id === currentPerson.id && settlement.from_person_id !== currentPerson.id) {
        addEntry(settlement.from_person_id, {
          id: `settlement-${settlement.id}`,
          label,
          date,
          amountCents: -settlement.amount_cents,
          kind: 'settlement',
        });
      }
    });

    map.forEach((entries) => {
      entries.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    });

    return map;
  }, [balanceInputs, currentPerson, expenses, settlements]);

  const toggleBreakdown = (personId: string) => {
    setExpandedPeople((current) =>
      current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]
    );
  };

  const formatSigned = (amountCents: number) =>
    amountCents >= 0
      ? `+${amountFormatter.format(amountCents / 100)}`
      : `-${amountFormatter.format(Math.abs(amountCents) / 100)}`;

  const handleSettleShortcut = (personId: string, amountCents: number) => {
    setSettleTo(personId);
    setSettleAmount((Math.abs(amountCents) / 100).toFixed(2));
  };

  const settlementMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Missing user session.');
      }
      if (!currentPerson) {
        throw new Error('Add yourself to this household first.');
      }

      const amountValue = Number(settleAmount);
      if (Number.isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Enter a valid amount.');
      }

      if (!settleTo) {
        throw new Error('Select who you paid.');
      }

      if (settleTo === currentPerson.id) {
        throw new Error('Choose someone else.');
      }

      return createSettlement({
        groupId,
        fromPersonId: currentPerson.id,
        toPersonId: settleTo,
        amountCents: Math.round(amountValue * 100),
        currency,
        paymentMethod: paymentMethod.trim() || undefined,
        notes: notes.trim() || undefined,
        createdBy: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['settlements', groupId] });
      setSettleAmount('');
      setPaymentMethod('');
      setNotes('');
      setFormError(null);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : 'Failed to record settlement.';
      setFormError(message);
    },
  });

  const canSettle = Boolean(currentPerson && settleTo && settleAmount && hasSupabaseEnv && !settlementMutation.isPending);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Balances</p>
          <p className="text-sm font-semibold text-slate-800">{groupName}</p>
        </div>
        {balanceLoading || peopleLoading ? <p className="text-sm text-slate-500">Loading balances...</p> : null}
        {balances.length === 0 && !balanceLoading ? (
          <p className="text-sm text-slate-500">No balances yet.</p>
        ) : null}
        {balances.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Your net</p>
              {currentPerson ? (
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {currentBalance >= 0
                    ? `${amountFormatter.format(currentBalance / 100)} owed to you`
                    : `${amountFormatter.format(Math.abs(currentBalance) / 100)} you owe`}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Add yourself to this household to see your balance.</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Net by person</p>
              <ul className="mt-2 space-y-2 text-sm">
                {balances.map((row) => (
                  <li key={row.personId} className="flex items-center justify-between">
                    <span className="text-slate-700">{row.displayName}</span>
                    <span className={row.netCents >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {row.netCents >= 0
                        ? `+${amountFormatter.format(row.netCents / 100)}`
                        : `-${amountFormatter.format(Math.abs(row.netCents) / 100)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {currentPerson ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">You owe</p>
              {youOwe.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No outstanding debts.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {youOwe.map((row) => (
                    <li key={row.personId} className="space-y-1 rounded-lg border border-slate-100 bg-white p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-slate-700">{row.displayName}</span>
                        <span className="font-semibold text-rose-600">
                          {amountFormatter.format(Math.abs(row.netCents) / 100)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => toggleBreakdown(row.personId)}
                          className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600"
                        >
                          {expandedPeople.includes(row.personId) ? 'Hide' : 'Details'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSettleShortcut(row.personId, row.netCents)}
                          className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600"
                        >
                          Settle up
                        </button>
                      </div>
                      {expandedPeople.includes(row.personId) ? (
                        <ul className="mt-2 space-y-1 text-xs text-slate-500">
                          {(contributionsByPerson.get(row.personId) ?? []).map((entry) => (
                            <li key={entry.id} className="flex items-center justify-between">
                              <span>
                                {entry.label}
                                {entry.date ? ` · ${entry.date}` : ''}
                              </span>
                              <span className={entry.amountCents >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                {formatSigned(entry.amountCents)}
                              </span>
                            </li>
                          ))}
                          {(contributionsByPerson.get(row.personId) ?? []).length === 0 ? (
                            <li className="text-slate-400">No expense breakdown yet.</li>
                          ) : null}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">You are owed</p>
              {youAreOwed.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No one owes you right now.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {youAreOwed.map((row) => (
                    <li key={row.personId} className="space-y-1 rounded-lg border border-slate-100 bg-white p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-slate-700">{row.displayName}</span>
                        <span className="font-semibold text-emerald-600">
                          {amountFormatter.format(row.netCents / 100)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => toggleBreakdown(row.personId)}
                          className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600"
                        >
                          {expandedPeople.includes(row.personId) ? 'Hide' : 'Details'}
                        </button>
                      </div>
                      {expandedPeople.includes(row.personId) ? (
                        <ul className="mt-2 space-y-1 text-xs text-slate-500">
                          {(contributionsByPerson.get(row.personId) ?? []).map((entry) => (
                            <li key={entry.id} className="flex items-center justify-between">
                              <span>
                                {entry.label}
                                {entry.date ? ` · ${entry.date}` : ''}
                              </span>
                              <span className={entry.amountCents >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                {formatSigned(entry.amountCents)}
                              </span>
                            </li>
                          ))}
                          {(contributionsByPerson.get(row.personId) ?? []).length === 0 ? (
                            <li className="text-slate-400">No expense breakdown yet.</li>
                          ) : null}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Record a settlement</p>
          <form
            className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr]"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError(null);
              settlementMutation.mutate();
            }}
          >
            <select
              value={settleTo}
              onChange={(event) => setSettleTo(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="">Paid to...</option>
              {people
                .filter((person) => person.id !== currentPerson?.id)
                .map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.display_name}
                  </option>
                ))}
            </select>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={settleAmount}
              onChange={(event) => setSettleAmount(event.target.value)}
              placeholder="Amount"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <input
              type="text"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              placeholder="Method (optional)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notes"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            {formError ? <p className="text-sm text-rose-600 lg:col-span-4">{formError}</p> : null}
            {!hasSupabaseEnv ? (
              <p className="text-xs text-amber-600 lg:col-span-4">Set Supabase env vars to enable settlements.</p>
            ) : null}
            <button
              type="submit"
              disabled={!canSettle}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400 lg:col-span-4"
            >
              {settlementMutation.isPending ? 'Saving...' : 'Record payment'}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Settlement history</p>
          {settlements.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No settlements yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {settlements.map((settlement) => (
                <li key={settlement.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-700">
                    {settlement.from_person?.display_name ?? 'Unknown'} →{' '}
                    {settlement.to_person?.display_name ?? 'Unknown'}
                  </span>
                  <span className="text-slate-600">
                    {amountFormatter.format(settlement.amount_cents / 100)} · {settlement.payment_method ?? 'Payment'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
