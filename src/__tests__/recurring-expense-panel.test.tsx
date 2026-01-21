import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecurringExpensePanel } from '../components/RecurringExpensePanel';
import { getNextOccurrence, getTodayDateString } from '../lib/recurring';

const fetchGroupPeopleMock = vi.fn();
const fetchExpenseCategoriesMock = vi.fn();
const fetchRecurringExpensesMock = vi.fn();
const createRecurringExpenseMock = vi.fn();
const updateRecurringExpenseMock = vi.fn();
const deleteRecurringExpenseMock = vi.fn();
const createExpenseWithSplitsMock = vi.fn();

vi.mock('../lib/api/groupPeople', () => ({
  fetchGroupPeople: (...args: unknown[]) => fetchGroupPeopleMock(...args),
}));

vi.mock('../lib/api/expenses', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/expenses')>();
  return {
    ...actual,
    fetchExpenseCategories: (...args: unknown[]) => fetchExpenseCategoriesMock(...args),
    createExpenseWithSplits: (...args: unknown[]) => createExpenseWithSplitsMock(...args),
  };
});

vi.mock('../lib/api/recurringExpenses', () => ({
  fetchRecurringExpenses: (...args: unknown[]) => fetchRecurringExpensesMock(...args),
  createRecurringExpense: (...args: unknown[]) => createRecurringExpenseMock(...args),
  updateRecurringExpense: (...args: unknown[]) => updateRecurringExpenseMock(...args),
  deleteRecurringExpense: (...args: unknown[]) => deleteRecurringExpenseMock(...args),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: true,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

describe('RecurringExpensePanel', () => {
  it('creates a recurring expense with percentage splits', async () => {
    fetchRecurringExpensesMock.mockResolvedValue([]);
    fetchExpenseCategoriesMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      { id: 'p1', display_name: 'Sam', user_id: null },
      { id: 'p2', display_name: 'Alex', user_id: null },
    ]);
    createRecurringExpenseMock.mockResolvedValue({ id: 're1' });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <RecurringExpensePanel groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    await userEvent.type(screen.getByPlaceholderText(/expense description/i), 'Rent');
    await userEvent.type(screen.getByPlaceholderText(/amount/i), '1200');

    await userEvent.click(screen.getByRole('button', { name: /percent/i }));

    const percentInputs = await screen.findAllByPlaceholderText('0.00');
    await userEvent.clear(percentInputs[0]);
    await userEvent.type(percentInputs[0], '60');
    await userEvent.clear(percentInputs[1]);
    await userEvent.type(percentInputs[1], '40');

    await userEvent.click(screen.getByRole('button', { name: /add recurring expense/i }));

    expect(createRecurringExpenseMock).toHaveBeenCalledWith({
      groupId: 'g1',
      description: 'Rent',
      amountCents: 120000,
      currency: 'USD',
      categoryId: null,
      paidByPersonId: 'p1',
      splitMethod: 'percentage',
      participantIds: ['p1', 'p2'],
      splitValues: { p1: 60, p2: 40 },
      adjustmentFromPersonId: null,
      frequency: 'monthly',
      interval: 1,
      nextOccurrence: getTodayDateString(),
      endDate: null,
      createdBy: 'user-1',
    });
  });

  it('generates expenses for due templates', async () => {
    const today = getTodayDateString();
    fetchRecurringExpensesMock.mockResolvedValue([
      {
        id: 're1',
        group_id: 'g1',
        description: 'Internet',
        amount_cents: 5000,
        currency: 'USD',
        category_id: null,
        paid_by_person_id: 'p1',
        split_method: 'equal',
        participant_ids: ['p1', 'p2'],
        split_values: null,
        adjustment_from_person_id: null,
        frequency: 'monthly',
        interval: 1,
        next_occurrence: today,
        end_date: null,
        is_active: true,
        created_by: 'user-1',
        created_at: '2024-01-01',
      },
    ]);
    fetchExpenseCategoriesMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      { id: 'p1', display_name: 'Sam', user_id: null },
      { id: 'p2', display_name: 'Alex', user_id: null },
    ]);
    createExpenseWithSplitsMock.mockResolvedValue({ id: 'e1' });
    updateRecurringExpenseMock.mockResolvedValue(undefined);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <RecurringExpensePanel groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: /generate due expenses/i }));

    await waitFor(() => {
      expect(createExpenseWithSplitsMock).toHaveBeenCalledWith({
        groupId: 'g1',
        description: 'Internet',
        amountCents: 5000,
        currency: 'USD',
        categoryId: null,
        expenseDate: today,
        paidByPersonId: 'p1',
        splitMethod: 'equal',
        participantIds: ['p1', 'p2'],
        createdBy: 'user-1',
      });
    });

    expect(updateRecurringExpenseMock).toHaveBeenCalledWith({
      recurringExpenseId: 're1',
      updates: {
        next_occurrence: getNextOccurrence(today, 'monthly', 1),
        is_active: true,
      },
    });
  });

  it('deletes a recurring expense template', async () => {
    fetchRecurringExpensesMock.mockResolvedValue([
      {
        id: 're1',
        group_id: 'g1',
        description: 'Gym',
        amount_cents: 3000,
        currency: 'USD',
        category_id: null,
        paid_by_person_id: 'p1',
        split_method: 'equal',
        participant_ids: ['p1'],
        split_values: null,
        adjustment_from_person_id: null,
        frequency: 'monthly',
        interval: 1,
        next_occurrence: getTodayDateString(),
        end_date: null,
        is_active: false,
        created_by: 'user-1',
        created_at: '2024-01-01',
      },
    ]);
    fetchExpenseCategoriesMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([{ id: 'p1', display_name: 'Sam', user_id: null }]);
    deleteRecurringExpenseMock.mockResolvedValue(undefined);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <RecurringExpensePanel groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    await userEvent.click(await screen.findByRole('button', { name: /delete/i }));

    expect(deleteRecurringExpenseMock).toHaveBeenCalledWith('re1');
    confirmSpy.mockRestore();
  });
});
