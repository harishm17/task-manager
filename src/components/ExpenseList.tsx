import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import PullToRefresh from 'react-pull-to-refresh';
import type { Expense } from '../lib/api/expenses';
import {
  calculatePercentageSplits,
  calculateShareSplits,
  createExpenseWithSplits,
  deleteExpense,
  fetchExpenseCategories,
  fetchExpenses,
  updateExpenseWithSplits
} from '../lib/api/expenses';
import { createRecurringExpense } from '../lib/api/recurringExpenses';
import { fetchGroupPeople } from '../lib/api/groupPeople';
import { useAuth } from '../contexts/AuthContext';
import { hasSupabaseEnv } from '../lib/supabaseClient';
import { ExpenseItem } from './expenses/ExpenseItem';
import { ExpenseForm } from './expenses/ExpenseForm';
import { ExpenseFilters } from './expenses/ExpenseFilters';

type ExpenseListProps = {
  groupId: string;
  groupName?: string;
  currency: string;
  isCreating: boolean;
  onCancel: () => void;
};

// Mutation data types
interface CreateExpenseMutationData {
  mode: 'single' | 'recurring';
  description: string;
  amount: string;
  expenseDate: string;
  categoryId: string | null;
  paidByPersonId: string;
  notes?: string;
  splitMethod: 'equal' | 'exact' | 'percentage' | 'shares' | 'adjustment';
  participantIds: string[];
  customSplits: Record<string, string>;
  adjustmentFromPersonId?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  interval?: string;
  endDate?: string;
}

interface UpdateExpenseMutationData {
  expenseId: string;
  description: string;
  amount: string;
  expenseDate: string;
  categoryId: string | null;
  paidByPersonId: string;
  notes?: string;
  splitMethod: 'equal' | 'exact' | 'percentage' | 'shares' | 'adjustment';
  participantIds: string[];
  customSplits: Record<string, string>;
  adjustmentFromPersonId?: string;
}

export function ExpenseList({ groupId, currency, isCreating, onCancel }: ExpenseListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paidByFilter, setPaidByFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expand / Edit
  const [expandedExpenseIds, setExpandedExpenseIds] = useState<string[]>([]);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Listen for FAB events
  useEffect(() => {
    const handleFabNewExpense = () => {
      onCancel(); // Close any existing forms
      // Small delay to ensure smooth transition
      setTimeout(() => {
        setFormError(null);
        setEditingExpenseId(null);
      }, 100);
    };

    window.addEventListener('fab-new-expense', handleFabNewExpense);
    return () => window.removeEventListener('fab-new-expense', handleFabNewExpense);
  }, [onCancel]);

  // Queries
  const { data: people = [] } = useQuery({
    queryKey: ['group-people', groupId],
    queryFn: () => fetchGroupPeople(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchExpenseCategories,
    enabled: hasSupabaseEnv,
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: () => fetchExpenses(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const peopleById = useMemo(() => {
    const map = new Map<string, string>();
    people.forEach(p => map.set(p.id, p.display_name));
    return map;
  }, [people]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: CreateExpenseMutationData) => {
      if (!user?.id) throw new Error('Missing user session.');
      const { mode, description, amount, expenseDate, categoryId, paidByPersonId, notes, splitMethod, participantIds, customSplits, adjustmentFromPersonId, frequency, interval, endDate } = data;

      const amountCents = Math.round(Number(amount) * 100);

      if (mode === 'recurring') {
        // Logic for recurring
        // Need to reconstruct splitValues from customSplits
        let splitValues: Record<string, number> | null = null;
        if (splitMethod !== 'equal' && splitMethod !== 'adjustment' && customSplits) {
          splitValues = {};
          participantIds.forEach((pid: string) => {
            splitValues![pid] = Number(customSplits[pid] || 0);
          });
        }

        return createRecurringExpense({
          groupId,
          description,
          amountCents,
          currency,
          categoryId: categoryId || null,
          paidByPersonId,
          splitMethod,
          participantIds: splitMethod === 'adjustment' ? [] : participantIds,
          splitValues,
          adjustmentFromPersonId: splitMethod === 'adjustment' ? (adjustmentFromPersonId || null) : null,
          frequency: frequency || 'monthly',
          interval: Number(interval || 1),
          nextOccurrence: expenseDate,
          endDate: endDate || null,
          createdBy: user.id
        });
      }

      const basePayload = {
        groupId,
        description,
        amountCents,
        currency,
        categoryId: categoryId || null,
        expenseDate,
        paidByPersonId,
        notes: notes || null,
        createdBy: user.id,
      };

      if (splitMethod === 'adjustment') {
        return createExpenseWithSplits({
          ...basePayload,
          splitMethod: 'adjustment',
          exactSplits: [{ personId: adjustmentFromPersonId || '', amountCents }]
        });
      }

      if (splitMethod === 'equal') {
        return createExpenseWithSplits({
          ...basePayload,
          splitMethod: 'equal',
          participantIds
        });
      }

      // Reconstruct exact splits for other methods
      // This logic is simplified; ExpenseForm helper `buildCustomSplits` logic needs to be replicated or simplified here.
      // For now, assuming ExpenseForm prepares data or we do a simple calc. 
      // Actually, createExpenseWithSplits needs `exactSplits`. 
      // We really should process the `customSplits` into `exactSplits`.
      // I will trust that the user enters valid amounts for 'exact'.
      // For percentage/shares, the backend or helper needs to calculate.
      // Wait, the original `ExpenseList` did extensive calculation before calling mutation.
      // I should probably move that calculation into `ExpenseForm` and have `onSubmit` return the `exactSplits` array if possible, or redo it here.
      // To keep `ExpenseForm` pure UI, I should do it here, but I need the logic.
      // Since `ExpenseForm` has the logic to calculate "preview", maybe passing that logic or moving it to a helper file is best.
      // I'll do a basic implementation here assuming 'exact' splits are passed or calculated.

      // FIXME: This part is tricky without the helper functions available here.
      // I'll assume for this refactor that we handle 'equal' and 'adjustment' perfectly.
      // For others, I'll iterate `customSplits` and try to construct `exactSplits`.

      const exactSplits = participantIds.map((pid: string) => {
        const val = customSplits?.[pid] || '0';
        // For exact method, values are in dollars
        return { personId: pid, amountCents: Math.round(Number(val) * 100) };
      });

      // Calculate final splits based on method
      let finalSplits;
      if (splitMethod === 'percentage') {
        const percentageSplits = participantIds.map(pid => ({ personId: pid, percentage: Number(customSplits?.[pid] || 0) }));
        finalSplits = calculatePercentageSplits(amountCents, percentageSplits);
      } else if (splitMethod === 'shares') {
        const shareSplits = participantIds.map(pid => ({ personId: pid, shares: Number(customSplits?.[pid] || 0) }));
        finalSplits = calculateShareSplits(amountCents, shareSplits);
      } else {
        finalSplits = exactSplits;
      }

      return createExpenseWithSplits({
        ...basePayload,
        splitMethod,
        exactSplits: finalSplits
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      onCancel();
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Error creating expense'),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateExpenseMutationData) => {
      if (!user?.id) throw new Error('Missing user session.');
      const { expenseId, description, amount, expenseDate, categoryId, paidByPersonId, notes, splitMethod, participantIds, customSplits, adjustmentFromPersonId } = data;

      const amountCents = Math.round(Number(amount) * 100);

      const basePayload = {
        expenseId,
        description,
        amountCents,
        currency,
        categoryId: categoryId || null,
        expenseDate,
        paidByPersonId,
        notes: notes || null,
      };

      if (splitMethod === 'adjustment') {
        return updateExpenseWithSplits({
          ...basePayload,
          splitMethod: 'adjustment',
          exactSplits: [{ personId: adjustmentFromPersonId || '', amountCents }]
        });
      }

      if (splitMethod === 'equal') {
        return updateExpenseWithSplits({
          ...basePayload,
          splitMethod: 'equal',
          participantIds
        });
      }

      // Handle exact, percentage, and shares split methods
      let finalSplits;
      if (splitMethod === 'percentage') {
        const percentageSplits = participantIds.map(pid => ({ personId: pid, percentage: Number(customSplits?.[pid] || 0) }));
        finalSplits = calculatePercentageSplits(amountCents, percentageSplits);
      } else if (splitMethod === 'shares') {
        const shareSplits = participantIds.map(pid => ({ personId: pid, shares: Number(customSplits?.[pid] || 0) }));
        finalSplits = calculateShareSplits(amountCents, shareSplits);
      } else {
        // For 'exact' method, values are in dollars
        finalSplits = participantIds.map((pid: string) => {
          const val = customSplits?.[pid] || '0';
          return { personId: pid, amountCents: Math.round(Number(val) * 100) };
        });
      }

      return updateExpenseWithSplits({
        ...basePayload,
        splitMethod,
        exactSplits: finalSplits
      });
    },
    onSuccess: () => {
      setEditingExpenseId(null);
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Error updating expense'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
  });

  // Filtering
  const filteredExpenses = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return expenses.filter((e) => {
      if (query && !e.description.toLowerCase().includes(query)) return false;
      if (categoryFilter !== 'all' && e.category_id !== categoryFilter) return false;
      if (paidByFilter !== 'all' && e.paid_by_person_id !== paidByFilter) return false;
      if (dateFrom && e.expense_date < dateFrom) return false;
      if (dateTo && e.expense_date > dateTo) return false;
      return true;
    });
  }, [expenses, searchQuery, categoryFilter, paidByFilter, dateFrom, dateTo]);

  const hasFilters = Boolean(searchQuery || categoryFilter !== 'all' || paidByFilter !== 'all' || dateFrom || dateTo);

  // Group by Month logic
  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filteredExpenses.forEach(e => {
      const month = new Date(e.expense_date).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[month]) groups[month] = [];
      groups[month].push(e);
    });
    return groups;
  }, [filteredExpenses]);

  // Memoized callbacks for performance
  const handleEdit = useCallback((expense: Expense) => {
    setEditingExpenseId(expense.id);
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
  }, [queryClient, groupId]);

  const handleToggleExpand = useCallback((expenseId: string) => {
    setExpandedExpenseIds(prev =>
      prev.includes(expenseId) ? prev.filter(id => id !== expenseId) : [...prev, expenseId]
    );
  }, []);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {isCreating && (
          <div className="mb-6">
            <ExpenseForm
              people={people}
              categories={categories}
              currency={currency}
                    onSubmit={(data) => createMutation.mutate(data as CreateExpenseMutationData)}
              onCancel={onCancel}
              isSubmitting={createMutation.isPending}
              error={formError}
            />
          </div>
        )}
      </AnimatePresence>

      <ExpenseFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        paidByFilter={paidByFilter}
        setPaidByFilter={setPaidByFilter}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        categories={categories}
        people={people}
        onClear={() => {
          setSearchQuery('');
          setCategoryFilter('all');
          setPaidByFilter('all');
          setDateFrom('');
          setDateTo('');
        }}
        hasFilters={hasFilters}
      />

      {isLoading && <p className="text-center text-slate-500">Loading expenses...</p>}

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-8">
          {Object.entries(groupedExpenses).map(([month, monthExpenses]) => (
            <div key={month} className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{month}</h3>
                <span className="text-xs font-medium text-slate-400">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(monthExpenses.reduce((sum, e) => sum + e.amount_cents, 0) / 100)}
                </span>
              </div>
              {monthExpenses.map(expense => (
                editingExpenseId === expense.id ? (
                  <ExpenseForm
                    key={expense.id}
                    mode="edit"
                    people={people}
                    categories={categories}
                    currency={currency}
                    initialData={{
                      description: expense.description,
                      amount_cents: expense.amount_cents,
                      expense_date: expense.expense_date,
                      category_id: expense.category_id ?? undefined,
                      paid_by_person_id: expense.paid_by_person_id,
                      split_method: expense.split_method,
                      notes: expense.notes ?? undefined,
                    }}
                    onSubmit={(data) => updateMutation.mutate({ 
                      expenseId: expense.id, 
                      description: data.description,
                      amount: data.amount,
                      expenseDate: data.expenseDate,
                      categoryId: data.categoryId,
                      paidByPersonId: data.paidByPersonId,
                      notes: data.notes,
                      splitMethod: data.splitMethod,
                      participantIds: data.participantIds,
                      customSplits: data.customSplits,
                      adjustmentFromPersonId: data.adjustmentFromPersonId,
                    })}
                    onCancel={() => setEditingExpenseId(null)}
                  />
                ) : (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    currency={currency}
                    currentUserId={user?.id}
                    peopleById={peopleById}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isExpanded={expandedExpenseIds.includes(expense.id)}
                    onToggleExpand={() => handleToggleExpand(expense.id)}
                  />
                )
              ))}
            </div>
          ))}
        </div>
      </PullToRefresh>
    </div>
  );
}
