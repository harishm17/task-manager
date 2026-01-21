import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within, waitFor } from '@testing-library/react';
import { DashboardPage } from '../pages/DashboardPage';

const fetchTasksMock = vi.fn();
const fetchExpensesMock = vi.fn();
const fetchSettlementsMock = vi.fn();
const fetchGroupPeopleMock = vi.fn();
const fetchBalanceInputsMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('../contexts/GroupContext', () => ({
  useGroups: () => ({
    activeGroup: { id: 'g1', name: 'Apartment', type: 'household', default_currency: 'USD' },
  }),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: true,
}));

vi.mock('../lib/api/tasks', () => ({
  fetchTasks: (...args: unknown[]) => fetchTasksMock(...args),
}));

vi.mock('../lib/api/expenses', () => ({
  fetchExpenses: (...args: unknown[]) => fetchExpensesMock(...args),
}));

vi.mock('../lib/api/settlements', () => ({
  fetchSettlements: (...args: unknown[]) => fetchSettlementsMock(...args),
}));

vi.mock('../lib/api/groupPeople', () => ({
  fetchGroupPeople: (...args: unknown[]) => fetchGroupPeopleMock(...args),
}));

vi.mock('../lib/api/balances', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/balances')>();
  return {
    ...actual,
    fetchBalanceInputs: (...args: unknown[]) => fetchBalanceInputsMock(...args),
  };
});

describe('DashboardPage', () => {
  it('renders task stats and household balance', async () => {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const today = localNow.toISOString().slice(0, 10);
    const overdueDate = new Date(localNow);
    overdueDate.setDate(overdueDate.getDate() - 2);
    const overdue = overdueDate.toISOString().slice(0, 10);
    const completedAt = new Date(localNow);
    completedAt.setDate(completedAt.getDate() - 1);

    fetchTasksMock.mockResolvedValue([
      {
        id: 't1',
        group_id: 'g1',
        title: 'Trash',
        description: null,
        status: 'todo',
        priority: 'medium',
        assigned_to_person_id: 'p1',
        created_by: 'u1',
        due_date: today,
        completed_at: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        id: 't2',
        group_id: 'g1',
        title: 'Clean kitchen',
        description: null,
        status: 'todo',
        priority: 'medium',
        assigned_to_person_id: null,
        created_by: 'u1',
        due_date: overdue,
        completed_at: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        id: 't3',
        group_id: 'g1',
        title: 'Dishes',
        description: null,
        status: 'completed',
        priority: 'medium',
        assigned_to_person_id: null,
        created_by: 'u1',
        due_date: today,
        completed_at: completedAt.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        id: 't4',
        group_id: 'g1',
        title: 'Laundry',
        description: null,
        status: 'in_progress',
        priority: 'medium',
        assigned_to_person_id: 'p1',
        created_by: 'u1',
        due_date: null,
        completed_at: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
    ]);
    fetchExpensesMock.mockResolvedValue([
      {
        id: 'e1',
        group_id: 'g1',
        description: 'Groceries',
        amount_cents: 2500,
        currency: 'USD',
        category_id: null,
        expense_date: '2024-01-09',
        paid_by_person_id: 'p1',
        split_method: 'equal',
        created_at: '2024-01-09T10:00:00Z',
      },
    ]);
    fetchSettlementsMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      { id: 'p1', display_name: 'Sam', user_id: 'u1' },
      { id: 'p2', display_name: 'Alex', user_id: null },
    ]);
    fetchBalanceInputsMock.mockResolvedValue({
      expenses: [{ id: 'e1', paid_by_person_id: 'p1' }],
      splits: [
        { expense_id: 'e1', person_id: 'p1', amount_owed_cents: 1250 },
        { expense_id: 'e1', person_id: 'p2', amount_owed_cents: 1250 },
      ],
      settlements: [],
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const dueCard = await screen.findByText(/tasks due today/i);
    const overdueCard = screen.getByText(/overdue tasks/i);
    const assignedCard = screen.getByText(/assigned to you/i);
    const completedCard = screen.getByText(/completed \(7 days\)/i);
    const pendingCard = screen.getByText(/pending tasks/i);

    await waitFor(() => {
      expect(within(dueCard.closest('div') ?? dueCard).getByText('1')).toBeInTheDocument();
      expect(within(overdueCard.closest('div') ?? overdueCard).getByText('1')).toBeInTheDocument();
      expect(within(assignedCard.closest('div') ?? assignedCard).getByText('2')).toBeInTheDocument();
      expect(within(completedCard.closest('div') ?? completedCard).getByText('1')).toBeInTheDocument();
      expect(within(pendingCard.closest('div') ?? pendingCard).getByText('3')).toBeInTheDocument();
    });

    expect(await screen.findByText(/you are owed 12.50/i)).toBeInTheDocument();
    expect(screen.getByText(/groceries/i)).toBeInTheDocument();
  });
});
