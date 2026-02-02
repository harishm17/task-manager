import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { hasSupabaseEnv } from '../lib/supabaseClient';
import { fetchGroupPeople } from '../lib/api/groupPeople';
import {
  buildExactSplits,
  calculateEqualSplits,
  createExpenseWithSplits,
  fetchExpenseCategories,
} from '../lib/api/expenses';
import { calculatePercentageSplits, calculateShareSplits, type SplitMethod } from '../lib/api/expenses';
import { createRecurringExpense, deleteRecurringExpense, fetchRecurringExpenses, updateRecurringExpense } from '../lib/api/recurringExpenses';
import { getDueOccurrences, getTodayDateString } from '../lib/recurring';

type RecurringExpensePanelProps = {
  groupId: string;
  groupName: string;
  currency: string;
  showCreateForm?: boolean;
};

type CustomMetrics = {
  total: number;
  complete: boolean;
  delta: number | null;
};

const calculateEqualPercentages = (personIds: string[]) => {
  if (personIds.length === 0) return [];
  const totalBasisPoints = 10000;
  const base = Math.floor(totalBasisPoints / personIds.length);
  let remainder = totalBasisPoints - base * personIds.length;

  return personIds.map((personId) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return { personId, percentage: (base + extra) / 100 };
  });
};

export function RecurringExpensePanel({
  groupId,
  groupName,
  currency,
  showCreateForm = true,
}: RecurringExpensePanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paidByPersonId, setPaidByPersonId] = useState('');
  const [adjustmentFromPersonId, setAdjustmentFromPersonId] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [interval, setInterval] = useState('1');
  const [nextOccurrence, setNextOccurrence] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  const parseAmountToCents = (value: string) => {
    const amountValue = Number(value);
    if (Number.isNaN(amountValue)) return null;
    return Math.round(amountValue * 100);
  };

  const parseNumericInput = (value: string) => {
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return null;
    return numberValue;
  };

  const formatCents = (cents: number) => (cents / 100).toFixed(2);

  const { data: people = [], isLoading: peopleLoading } = useQuery({
    queryKey: ['group-people', groupId],
    queryFn: () => fetchGroupPeople(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchExpenseCategories,
    enabled: hasSupabaseEnv,
  });

  const { data: recurringExpenses = [], isLoading: recurringLoading } = useQuery({
    queryKey: ['recurring-expenses', groupId],
    queryFn: () => fetchRecurringExpenses(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  // Initialize default values when people first loads (one-time initialization)
  const hasInitializedDefaults = useRef(false);
  useEffect(() => {
    if (!hasInitializedDefaults.current && people.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!paidByPersonId) setPaidByPersonId(people[0].id);
       
      if (!adjustmentFromPersonId) setAdjustmentFromPersonId(people[0].id);
       
      if (participantIds.length === 0) setParticipantIds(people.map((person) => person.id));
      hasInitializedDefaults.current = true;
    }
  }, [people, paidByPersonId, adjustmentFromPersonId, participantIds]);

  const seedCustomValues = useCallback((method: SplitMethod, nextParticipantIds: string[]) => {
    if (method === 'exact') {
      const amountCents = parseAmountToCents(amount);
      if (amountCents === null) return {};
      return calculateEqualSplits(amountCents, nextParticipantIds).reduce<Record<string, string>>(
        (acc, split) => {
          acc[split.personId] = formatCents(split.amountCents);
          return acc;
        },
        {}
      );
    }
    if (method === 'percentage') {
      return calculateEqualPercentages(nextParticipantIds).reduce<Record<string, string>>((acc, split) => {
        acc[split.personId] = split.percentage.toFixed(2);
        return acc;
      }, {});
    }
    if (method === 'shares') {
      return nextParticipantIds.reduce<Record<string, string>>((acc, personId) => {
        acc[personId] = '1';
        return acc;
      }, {});
    }
    return {};
  }, [amount]);

  const syncCustomSplits = useCallback((nextParticipantIds: string[], seed: boolean) => {
    setCustomSplits((current) => {
      const next: Record<string, string> = {};
      nextParticipantIds.forEach((personId) => {
        next[personId] = current[personId] ?? '';
      });
      if (seed) {
        const seeded = seedCustomValues(splitMethod, nextParticipantIds);
        nextParticipantIds.forEach((personId) => {
          if (seeded[personId] !== undefined) {
            next[personId] = seeded[personId];
          }
        });
      }
      return next;
    });
  }, [seedCustomValues, splitMethod]);

  // Initialize custom splits when split method changes (one-time per method change)
  const prevSplitMethodRef = useRef<SplitMethod | null>(null);
  useEffect(() => {
    if (prevSplitMethodRef.current !== splitMethod) {
      if (splitMethod !== 'equal' && splitMethod !== 'adjustment' && participantIds.length > 0 && Object.keys(customSplits).length === 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        syncCustomSplits(participantIds, true);
      }
      prevSplitMethodRef.current = splitMethod;
    }
  }, [splitMethod, participantIds, customSplits, syncCustomSplits]);

  const setSplitMethodWithSeed = (method: SplitMethod) => {
    setSplitMethod(method);
    setCustomSplits({});
  };

  const selectedPeople = useMemo(
    () => people.filter((person) => participantIds.includes(person.id)),
    [people, participantIds]
  );

  const computeCustomMetrics = (
    method: SplitMethod,
    selected: typeof selectedPeople,
    values: Record<string, string>,
    totalAmountCents: number | null
  ): CustomMetrics => {
    if (method === 'exact') {
      const total = selected.reduce((sum, person) => {
        const input = values[person.id];
        const splitCents = input ? parseAmountToCents(input) : null;
        return sum + (splitCents ?? 0);
      }, 0);
      const complete =
        selected.length > 0 &&
        selected.every((person) => {
          const input = values[person.id];
          const splitCents = input ? parseAmountToCents(input) : null;
          return input !== undefined && input !== '' && splitCents !== null && splitCents >= 0;
        });
      const delta = totalAmountCents !== null ? totalAmountCents - total : null;
      return { total, complete, delta };
    }

    if (method === 'percentage') {
      const total = selected.reduce((sum, person) => {
        const input = values[person.id];
        const percent = input ? parseNumericInput(input) : null;
        return sum + (percent ?? 0);
      }, 0);
      const complete =
        selected.length > 0 &&
        selected.every((person) => {
          const input = values[person.id];
          const percent = input ? parseNumericInput(input) : null;
          return input !== undefined && input !== '' && percent !== null && percent >= 0;
        });
      const delta = 100 - total;
      return { total, complete, delta };
    }

    if (method === 'shares') {
      const total = selected.reduce((sum, person) => {
        const input = values[person.id];
        const shares = input ? parseNumericInput(input) : null;
        return sum + (shares ?? 0);
      }, 0);
      const complete =
        selected.length > 0 &&
        selected.every((person) => {
          const input = values[person.id];
          const shares = input ? parseNumericInput(input) : null;
          return input !== undefined && input !== '' && shares !== null && shares > 0;
        });
      return { total, complete, delta: null };
    }

    return { total: 0, complete: false, delta: null };
  };

  const amountCents = parseAmountToCents(amount);
  const customMetrics = computeCustomMetrics(splitMethod, selectedPeople, customSplits, amountCents);
  const isDeltaZero = (value: number | null) => value !== null && Math.abs(value) < 0.001;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Missing user session.');
      }
      const trimmed = description.trim();
      if (!trimmed) {
        throw new Error('Description is required.');
      }
      const amountValue = parseAmountToCents(amount);
      if (amountValue === null || amountValue <= 0) {
        throw new Error('Enter a valid amount.');
      }
      const intervalValue = Number(interval);
      if (!Number.isFinite(intervalValue) || intervalValue < 1) {
        throw new Error('Interval must be at least 1.');
      }
      if (!nextOccurrence) {
        throw new Error('Pick a start date.');
      }
      if (!paidByPersonId) {
        throw new Error(splitMethod === 'adjustment' ? 'Select who receives.' : 'Select who paid.');
      }

      let participantValues: Record<string, number> | null = null;
      let participantIdsPayload = participantIds;
      let adjustmentFrom: string | null = null;

      if (splitMethod === 'adjustment') {
        if (!adjustmentFromPersonId) {
          throw new Error('Select who owes.');
        }
        if (adjustmentFromPersonId === paidByPersonId) {
          throw new Error('Choose two different people.');
        }
        participantIdsPayload = [];
        adjustmentFrom = adjustmentFromPersonId;
      } else {
        if (participantIds.length === 0) {
          throw new Error('Select at least one person to split with.');
        }

        if (splitMethod === 'exact') {
          participantValues = {};
          participantIds.forEach((personId) => {
            const input = customSplits[personId];
            if (!input) {
              throw new Error('Enter amounts for all selected people.');
            }
            const splitCents = parseAmountToCents(input);
            if (splitCents === null || splitCents < 0) {
              throw new Error('Enter valid split amounts.');
            }
            participantValues![personId] = splitCents;
          });
          buildExactSplits(
            amountValue,
            Object.entries(participantValues).map(([personId, amountCentsValue]) => ({
              personId,
              amountCents: amountCentsValue,
            }))
          );
        }

        if (splitMethod === 'percentage') {
          participantValues = {};
          participantIds.forEach((personId) => {
            const input = customSplits[personId];
            if (!input) {
              throw new Error('Enter percentages for all selected people.');
            }
            const percent = parseNumericInput(input);
            if (percent === null || percent < 0) {
              throw new Error('Enter valid percentages.');
            }
            participantValues![personId] = percent;
          });
          calculatePercentageSplits(
            amountValue,
            Object.entries(participantValues).map(([personId, percentage]) => ({
              personId,
              percentage,
            }))
          );
        }

        if (splitMethod === 'shares') {
          participantValues = {};
          participantIds.forEach((personId) => {
            const input = customSplits[personId];
            if (!input) {
              throw new Error('Enter shares for all selected people.');
            }
            const shares = parseNumericInput(input);
            if (shares === null || shares <= 0) {
              throw new Error('Enter valid share counts.');
            }
            participantValues![personId] = shares;
          });
          calculateShareSplits(
            amountValue,
            Object.entries(participantValues).map(([personId, shares]) => ({
              personId,
              shares,
            }))
          );
        }
      }

      return createRecurringExpense({
        groupId,
        description: trimmed,
        amountCents: amountValue,
        currency,
        categoryId,
        paidByPersonId,
        splitMethod,
        participantIds: participantIdsPayload,
        splitValues: participantValues,
        adjustmentFromPersonId: adjustmentFrom,
        frequency,
        interval: Math.floor(intervalValue),
        nextOccurrence,
        endDate: endDate || null,
        createdBy: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', groupId] });
      setDescription('');
      setAmount('');
      setCategoryId(null);
      setInterval('1');
      setNextOccurrence(getTodayDateString());
      setEndDate('');
      setSplitMethod('equal');
      setCustomSplits({});
      setFormError(null);
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error ? mutationError.message : 'Failed to create recurring expense.';
      setFormError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (recurringExpenseId: string) => {
      await deleteRecurringExpense(recurringExpenseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', groupId] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Missing user session.');
      }
      const today = getTodayDateString();
      let created = 0;

      for (const template of recurringExpenses) {
        if (!template.is_active) continue;

        const result = getDueOccurrences({
          nextOccurrence: template.next_occurrence,
          endDate: template.end_date,
          frequency: template.frequency,
          interval: template.interval,
          today,
        });

        if (result.occurrences.length === 0) {
          if (!result.isActive) {
            await updateRecurringExpense({
              recurringExpenseId: template.id,
              updates: {
                next_occurrence: result.nextOccurrence,
                is_active: false,
              },
            });
          }
          continue;
        }

        for (const occurrence of result.occurrences) {
          if (template.split_method === 'adjustment') {
            if (!template.adjustment_from_person_id) continue;
            await createExpenseWithSplits({
              groupId,
              description: template.description,
              amountCents: template.amount_cents,
              currency: template.currency,
              categoryId: template.category_id,
              expenseDate: occurrence,
              paidByPersonId: template.paid_by_person_id,
              splitMethod: 'adjustment',
              exactSplits: [
                { personId: template.adjustment_from_person_id, amountCents: template.amount_cents },
              ],
              createdBy: user.id,
            });
          } else if (template.split_method === 'equal') {
            if (template.participant_ids.length === 0) {
              continue;
            }
            await createExpenseWithSplits({
              groupId,
              description: template.description,
              amountCents: template.amount_cents,
              currency: template.currency,
              categoryId: template.category_id,
              expenseDate: occurrence,
              paidByPersonId: template.paid_by_person_id,
              splitMethod: 'equal',
              participantIds: template.participant_ids,
              createdBy: user.id,
            });
          } else {
            const values = template.split_values ?? {};
            if (Object.keys(values).length === 0) {
              continue;
            }
            if (template.split_method === 'percentage') {
              const exactSplits = calculatePercentageSplits(
                template.amount_cents,
                Object.entries(values).map(([personId, percentage]) => ({
                  personId,
                  percentage,
                }))
              );
              await createExpenseWithSplits({
                groupId,
                description: template.description,
                amountCents: template.amount_cents,
                currency: template.currency,
                categoryId: template.category_id,
                expenseDate: occurrence,
                paidByPersonId: template.paid_by_person_id,
                splitMethod: 'percentage',
                exactSplits,
                createdBy: user.id,
              });
            } else if (template.split_method === 'shares') {
              const exactSplits = calculateShareSplits(
                template.amount_cents,
                Object.entries(values).map(([personId, shares]) => ({
                  personId,
                  shares,
                }))
              );
              await createExpenseWithSplits({
                groupId,
                description: template.description,
                amountCents: template.amount_cents,
                currency: template.currency,
                categoryId: template.category_id,
                expenseDate: occurrence,
                paidByPersonId: template.paid_by_person_id,
                splitMethod: 'shares',
                exactSplits,
                createdBy: user.id,
              });
            } else {
              const exactSplits = Object.entries(values).map(([personId, cents]) => ({
                personId,
                amountCents: Math.round(cents),
              }));
              await createExpenseWithSplits({
                groupId,
                description: template.description,
                amountCents: template.amount_cents,
                currency: template.currency,
                categoryId: template.category_id,
                expenseDate: occurrence,
                paidByPersonId: template.paid_by_person_id,
                splitMethod: 'exact',
                exactSplits,
                createdBy: user.id,
              });
            }
          }
          created += 1;
        }

        await updateRecurringExpense({
          recurringExpenseId: template.id,
          updates: {
            next_occurrence: result.nextOccurrence,
            is_active: result.isActive,
          },
        });
      }

      return created;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', groupId] });
      setGenerateMessage(count > 0 ? `Generated ${count} expense(s).` : 'No expenses were due.');
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error ? mutationError.message : 'Failed to generate expenses.';
      setGenerateMessage(message);
    },
  });

  const paidByPlaceholder = splitMethod === 'adjustment' ? 'Receives...' : 'Paid by...';

  const canCreate =
    !createMutation.isPending &&
    hasSupabaseEnv &&
    description.trim().length > 0 &&
    amountCents !== null &&
    amountCents > 0 &&
    paidByPersonId.length > 0 &&
    (splitMethod === 'adjustment'
      ? adjustmentFromPersonId.length > 0 && adjustmentFromPersonId !== paidByPersonId
      : participantIds.length > 0 &&
        (splitMethod === 'equal' ||
          (splitMethod === 'shares'
            ? customMetrics.complete && customMetrics.total > 0
            : customMetrics.complete && isDeltaZero(customMetrics.delta))));

  const peopleById = useMemo(() => {
    const map = new Map<string, string>();
    people.forEach((person) => map.set(person.id, person.display_name));
    return map;
  }, [people]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Recurring expenses</p>
          <p className="text-sm text-slate-600">
            {showCreateForm
              ? `Create repeating expenses for ${groupName} and generate them on demand.`
              : `Generate due expenses and review templates for ${groupName}.`}
          </p>
        </div>
        {showCreateForm ? (
          <form
            className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr]"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError(null);
              createMutation.mutate();
            }}
          >
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Expense description"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              required
            />
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Amount"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              required
            />
            <select
              value={categoryId ?? ''}
              onChange={(event) => setCategoryId(event.target.value || null)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="">Category (optional)</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon ? `${category.icon} ` : ''}{category.name}
                </option>
              ))}
            </select>
            <select
              value={paidByPersonId}
              onChange={(event) => setPaidByPersonId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="">{paidByPlaceholder}</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.display_name}
                </option>
              ))}
            </select>
            {splitMethod === 'adjustment' ? (
              <select
                value={adjustmentFromPersonId}
                onChange={(event) => setAdjustmentFromPersonId(event.target.value)}
                aria-label="Owes person"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="">Owes...</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.display_name}
                  </option>
                ))}
              </select>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const nextIds = people.map((person) => person.id);
                  setParticipantIds(nextIds);
                  if (splitMethod !== 'equal') {
                    syncCustomSplits(nextIds, false);
                  }
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                Split with all
              </button>
            )}
            <select
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as 'daily' | 'weekly' | 'monthly')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <input
              type="number"
              min="1"
              value={interval}
              onChange={(event) => setInterval(event.target.value)}
              placeholder="Every 1"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <input
              type="date"
              value={nextOccurrence}
              onChange={(event) => setNextOccurrence(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              placeholder="End date (optional)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-2 lg:col-span-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Split method</span>
              <button
                type="button"
                onClick={() => setSplitMethodWithSeed('equal')}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  splitMethod === 'equal'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Equal
              </button>
              <button
                type="button"
                onClick={() => setSplitMethodWithSeed('exact')}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  splitMethod === 'exact'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Exact
              </button>
              <button
                type="button"
                onClick={() => setSplitMethodWithSeed('percentage')}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  splitMethod === 'percentage'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Percent
              </button>
              <button
                type="button"
                onClick={() => setSplitMethodWithSeed('shares')}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  splitMethod === 'shares'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Shares
              </button>
              <button
                type="button"
                onClick={() => setSplitMethodWithSeed('adjustment')}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  splitMethod === 'adjustment'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Adjust
              </button>
              {splitMethod === 'adjustment' ? (
                <span className="text-xs text-slate-500">Reimburse one person from another.</span>
              ) : null}
            </div>
            {splitMethod !== 'equal' && splitMethod !== 'adjustment' ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 lg:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Split with</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {people.map((person) => (
                    <label
                      key={person.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                        participantIds.includes(person.id)
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={participantIds.includes(person.id)}
                        onChange={() => {
                          setParticipantIds((current) => {
                            const next = current.includes(person.id)
                              ? current.filter((id) => id !== person.id)
                              : [...current, person.id];
                            syncCustomSplits(next, false);
                            return next;
                          });
                        }}
                        className="hidden"
                      />
                      {person.display_name}
                    </label>
                  ))}
                  {peopleLoading ? (
                    <span className="text-xs text-slate-500">Loading people...</span>
                  ) : null}
                </div>
                <div className="mt-3 space-y-2">
                  {selectedPeople.length === 0 ? (
                    <p className="text-xs text-slate-500">Select people to set custom amounts.</p>
                  ) : null}
                  {selectedPeople.map((person) => (
                    <div key={person.id} className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-700">{person.display_name}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step={splitMethod === 'shares' ? '0.1' : '0.01'}
                        value={customSplits[person.id] ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setCustomSplits((current) => ({ ...current, [person.id]: value }));
                        }}
                        placeholder={splitMethod === 'shares' ? '0' : '0.00'}
                        className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    {splitMethod === 'exact' ? (
                      <>
                        <span>
                          Allocated {formatCents(customMetrics.total)} /{' '}
                          {amountCents !== null ? formatCents(amountCents) : '0.00'}
                        </span>
                        {customMetrics.delta !== null && !isDeltaZero(customMetrics.delta) ? (
                          <span className="text-rose-600">
                            Diff {formatCents(Math.abs(customMetrics.delta))}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                    {splitMethod === 'percentage' ? (
                      <>
                        <span>Allocated {customMetrics.total.toFixed(2)}% / 100%</span>
                        {!isDeltaZero(customMetrics.delta) ? (
                          <span className="text-rose-600">
                            Diff {Math.abs(customMetrics.delta ?? 0).toFixed(2)}%
                          </span>
                        ) : null}
                      </>
                    ) : null}
                    {splitMethod === 'shares' ? (
                      <span>Total shares: {customMetrics.total.toFixed(2)}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
            {formError ? <p className="text-sm text-rose-600 lg:col-span-3">{formError}</p> : null}
            {!hasSupabaseEnv ? (
              <p className="text-xs text-amber-600 lg:col-span-3">
                Set Supabase env vars to enable recurring expenses.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!canCreate}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400 lg:col-span-3"
            >
              {createMutation.isPending ? 'Saving...' : 'Add recurring expense'}
            </button>
          </form>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-800">Templates</p>
          <button
            type="button"
            onClick={() => {
              setGenerateMessage(null);
              generateMutation.mutate();
            }}
            disabled={!hasSupabaseEnv || generateMutation.isPending || recurringExpenses.length === 0}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {generateMutation.isPending ? 'Generating...' : 'Generate due expenses'}
          </button>
        </div>
        {generateMessage ? <p className="text-xs text-slate-600">{generateMessage}</p> : null}
        {recurringLoading ? <p className="text-sm text-slate-500">Loading recurring expenses...</p> : null}
        {!recurringLoading && recurringExpenses.length === 0 ? (
          <p className="text-sm text-slate-500">No recurring expenses yet.</p>
        ) : null}
        {recurringExpenses.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {recurringExpenses.map((template) => (
              <li key={template.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{template.description}</p>
                    <p className="text-xs text-slate-500">
                      Next: {template.next_occurrence} · {template.frequency} × {template.interval}
                      {template.end_date ? ` · Ends ${template.end_date}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{(template.amount_cents / 100).toFixed(2)} {template.currency}</p>
                    <p>{template.split_method}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Paid by {peopleById.get(template.paid_by_person_id) ?? 'Unknown'}
                  {template.split_method === 'adjustment' && template.adjustment_from_person_id
                    ? ` · Owes ${peopleById.get(template.adjustment_from_person_id) ?? 'Unknown'}`
                    : ''}
                </p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this recurring expense template?')) {
                        deleteMutation.mutate(template.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-600 disabled:cursor-not-allowed disabled:text-rose-400"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
