import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BalancesPanel } from '../components/BalancesPanel';

const fetchGroupPeopleMock = vi.fn();
const fetchBalanceInputsMock = vi.fn();
const fetchExpensesMock = vi.fn();
const fetchSettlementsMock = vi.fn();
const createSettlementMock = vi.fn();

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

vi.mock('../lib/api/settlements', () => ({
  fetchSettlements: (...args: unknown[]) => fetchSettlementsMock(...args),
  createSettlement: (...args: unknown[]) => createSettlementMock(...args),
}));

vi.mock('../lib/api/expenses', () => ({
  fetchExpenses: (...args: unknown[]) => fetchExpensesMock(...args),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: true,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

describe('BalancesPanel', () => {
  it('records a settlement from current user', async () => {
    fetchGroupPeopleMock.mockResolvedValue([
      { id: 'p1', display_name: 'Sam', user_id: 'u1' },
      { id: 'p2', display_name: 'Alex', user_id: null },
    ]);
    fetchBalanceInputsMock.mockResolvedValue({
      expenses: [],
      splits: [],
      settlements: [],
    });
    fetchExpensesMock.mockResolvedValue([]);
    fetchSettlementsMock.mockResolvedValue([]);
    createSettlementMock.mockResolvedValue({ id: 's1' });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <BalancesPanel groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    await screen.findByRole('option', { name: 'Alex' });
    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'p2');
    await userEvent.type(screen.getByPlaceholderText(/amount/i), '12');

    await userEvent.click(screen.getByRole('button', { name: /record payment/i }));

    expect(createSettlementMock).toHaveBeenCalledWith({
      groupId: 'g1',
      fromPersonId: 'p1',
      toPersonId: 'p2',
      amountCents: 1200,
      currency: 'USD',
      paymentMethod: undefined,
      notes: undefined,
      createdBy: 'u1',
    });
  });

  it('prefills settle up from the you owe list', async () => {
    fetchGroupPeopleMock.mockResolvedValue([
      { id: 'p1', display_name: 'Sam', user_id: 'u1' },
      { id: 'p2', display_name: 'Alex', user_id: null },
    ]);
    fetchBalanceInputsMock.mockResolvedValue({
      expenses: [{ id: 'e1', paid_by_person_id: 'p2' }],
      splits: [
        { expense_id: 'e1', person_id: 'p1', amount_owed_cents: 500 },
        { expense_id: 'e1', person_id: 'p2', amount_owed_cents: 500 },
      ],
      settlements: [],
    });
    fetchExpensesMock.mockResolvedValue([
      {
        id: 'e1',
        group_id: 'g1',
        description: 'Groceries',
        amount_cents: 1000,
        currency: 'USD',
        category_id: null,
        expense_date: '2024-01-01',
        paid_by_person_id: 'p2',
        split_method: 'equal',
        receipt_url: null,
        created_at: '2024-01-01',
      },
    ]);
    fetchSettlementsMock.mockResolvedValue([]);
    createSettlementMock.mockResolvedValue({ id: 's1' });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <BalancesPanel groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    const settleButton = await screen.findByRole('button', { name: /settle up/i });
    await userEvent.click(settleButton);

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('p2');
    expect(screen.getByPlaceholderText(/amount/i)).toHaveValue(5);

    await userEvent.click(screen.getByRole('button', { name: /record payment/i }));

    expect(createSettlementMock).toHaveBeenCalledWith({
      groupId: 'g1',
      fromPersonId: 'p1',
      toPersonId: 'p2',
      amountCents: 500,
      currency: 'USD',
      paymentMethod: undefined,
      notes: undefined,
      createdBy: 'u1',
    });
  });
});
