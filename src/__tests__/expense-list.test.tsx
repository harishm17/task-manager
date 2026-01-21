import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseList } from '../components/ExpenseList';

const fetchExpensesMock = vi.fn();
const fetchExpenseCategoriesMock = vi.fn();
const fetchGroupPeopleMock = vi.fn();
const fetchExpenseSplitsMock = vi.fn();
const createExpenseWithSplitsMock = vi.fn();
const createRecurringExpenseMock = vi.fn();
const updateExpenseWithSplitsMock = vi.fn();
const uploadExpenseReceiptMock = vi.fn();
const updateExpenseReceiptMock = vi.fn();

vi.mock('../lib/api/expenses', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/expenses')>();
  return {
    ...actual,
    fetchExpenses: (...args: unknown[]) => fetchExpensesMock(...args),
    fetchExpenseSplits: (...args: unknown[]) => fetchExpenseSplitsMock(...args),
    fetchExpenseCategories: (...args: unknown[]) => fetchExpenseCategoriesMock(...args),
    createExpenseWithSplits: (...args: unknown[]) => createExpenseWithSplitsMock(...args),
    updateExpenseWithSplits: (...args: unknown[]) => updateExpenseWithSplitsMock(...args),
    uploadExpenseReceipt: (...args: unknown[]) => uploadExpenseReceiptMock(...args),
    updateExpenseReceipt: (...args: unknown[]) => updateExpenseReceiptMock(...args),
    deleteExpense: vi.fn(),
  };
});

vi.mock('../lib/api/recurringExpenses', () => ({
  createRecurringExpense: (...args: unknown[]) => createRecurringExpenseMock(...args),
}));

vi.mock('../lib/api/groupPeople', () => ({
  fetchGroupPeople: (...args: unknown[]) => fetchGroupPeopleMock(...args),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: true,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

describe('ExpenseList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an expense with selected participants', async () => {
    fetchExpensesMock.mockResolvedValue([]);
    fetchExpenseCategoriesMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: null,
        display_name: 'Sam',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
      {
        id: 'p2',
        group_id: 'g1',
        user_id: null,
        display_name: 'Alex',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);
    createExpenseWithSplitsMock.mockResolvedValue({ id: 'e1' });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ExpenseList groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    await userEvent.type(screen.getByPlaceholderText(/description/i), 'Groceries');
    await userEvent.type(screen.getByPlaceholderText(/notes/i), 'Used coupons');
    await userEvent.type(screen.getByPlaceholderText(/amount/i), '25.50');

    const alexLabel = screen
      .getAllByText('Alex')
      .find((node) => node.tagName.toLowerCase() === 'label');
    if (!alexLabel) {
      throw new Error('Alex label not found');
    }
    await userEvent.click(alexLabel);

    await userEvent.click(screen.getByRole('button', { name: /add expense/i }));

    expect(createExpenseWithSplitsMock).toHaveBeenCalledWith({
      groupId: 'g1',
      description: 'Groceries',
      amountCents: 2550,
      currency: 'USD',
      categoryId: null,
      expenseDate: new Date().toISOString().slice(0, 10),
      paidByPersonId: 'p1',
      notes: 'Used coupons',
      participantIds: ['p1'],
      splitMethod: 'equal',
      createdBy: 'user-1',
    });
  });

  it('creates a recurring expense when scheduled', async () => {
    fetchExpensesMock.mockResolvedValue([]);
    fetchExpenseCategoriesMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: null,
        display_name: 'Sam',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
      {
        id: 'p2',
        group_id: 'g1',
        user_id: null,
        display_name: 'Alex',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);
    createRecurringExpenseMock.mockResolvedValue({ id: 're1' });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ExpenseList groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    const form = screen.getByPlaceholderText(/description/i).closest('form');
    if (!form) {
      throw new Error('Expense form not found');
    }
    const [paidBySelect] = within(form).getAllByRole('combobox');
    await within(paidBySelect).findByRole('option', { name: 'Sam' });
    await userEvent.selectOptions(paidBySelect, 'p1');
    await userEvent.click(within(form).getByRole('button', { name: /split with all/i }));
    await userEvent.type(screen.getByPlaceholderText(/description/i), 'Internet');
    await userEvent.type(screen.getByPlaceholderText(/amount/i), '50.00');
    const dateInput = screen.getByLabelText(/expense date/i);
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2024-03-01');
    await userEvent.click(screen.getByLabelText(/schedule this expense/i));

    await userEvent.click(screen.getByRole('button', { name: /add recurring expense/i }));

    expect(createRecurringExpenseMock).toHaveBeenCalledWith({
      groupId: 'g1',
      description: 'Internet',
      amountCents: 5000,
      currency: 'USD',
      categoryId: null,
      paidByPersonId: 'p1',
      splitMethod: 'equal',
      participantIds: ['p1', 'p2'],
      splitValues: null,
      adjustmentFromPersonId: null,
      frequency: 'monthly',
      interval: 1,
      nextOccurrence: '2024-03-01',
      endDate: null,
      createdBy: 'user-1',
    });
    expect(createExpenseWithSplitsMock).not.toHaveBeenCalled();
  });

  it('creates an expense with exact splits', async () => {
    fetchExpensesMock.mockResolvedValue([]);
    fetchExpenseCategoriesMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: null,
        display_name: 'Sam',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
      {
        id: 'p2',
        group_id: 'g1',
        user_id: null,
        display_name: 'Alex',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);
    createExpenseWithSplitsMock.mockResolvedValue({ id: 'e2' });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ExpenseList groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    await userEvent.type(screen.getByPlaceholderText(/description/i), 'Utilities');
    await userEvent.type(screen.getByPlaceholderText(/amount/i), '25.50');

    await userEvent.click(screen.getByRole('button', { name: /exact/i }));

    const customInputs = await screen.findAllByPlaceholderText('0.00');
    await userEvent.clear(customInputs[0]);
    await userEvent.type(customInputs[0], '10');
    await userEvent.clear(customInputs[1]);
    await userEvent.type(customInputs[1], '15.50');

    await userEvent.click(screen.getByRole('button', { name: /add expense/i }));

    expect(createExpenseWithSplitsMock).toHaveBeenCalledWith({
      groupId: 'g1',
      description: 'Utilities',
      amountCents: 2550,
      currency: 'USD',
      categoryId: null,
      expenseDate: new Date().toISOString().slice(0, 10),
      paidByPersonId: 'p1',
      notes: null,
      splitMethod: 'exact',
      exactSplits: [
        { personId: 'p1', amountCents: 1000 },
        { personId: 'p2', amountCents: 1550 },
      ],
      createdBy: 'user-1',
    });
  });

  it('creates an expense with percentage splits', async () => {
    fetchExpensesMock.mockResolvedValue([]);
    fetchExpenseCategoriesMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: null,
        display_name: 'Sam',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
      {
        id: 'p2',
        group_id: 'g1',
        user_id: null,
        display_name: 'Alex',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);
    createExpenseWithSplitsMock.mockResolvedValue({ id: 'e3' });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ExpenseList groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    await userEvent.type(screen.getByPlaceholderText(/description/i), 'Supplies');
    await userEvent.type(screen.getByPlaceholderText(/amount/i), '10.00');

    await userEvent.click(screen.getByRole('button', { name: /percent/i }));

    const percentInputs = await screen.findAllByPlaceholderText('0.00');
    await userEvent.clear(percentInputs[0]);
    await userEvent.type(percentInputs[0], '40');
    await userEvent.clear(percentInputs[1]);
    await userEvent.type(percentInputs[1], '60');

    await userEvent.click(screen.getByRole('button', { name: /add expense/i }));

    expect(createExpenseWithSplitsMock).toHaveBeenCalledWith({
      groupId: 'g1',
      description: 'Supplies',
      amountCents: 1000,
      currency: 'USD',
      categoryId: null,
      expenseDate: new Date().toISOString().slice(0, 10),
      paidByPersonId: 'p1',
      notes: null,
      splitMethod: 'percentage',
      exactSplits: [
        { personId: 'p1', amountCents: 400 },
        { personId: 'p2', amountCents: 600 },
      ],
      createdBy: 'user-1',
    });
  });

  it('creates an adjustment expense', async () => {
    fetchExpensesMock.mockResolvedValue([]);
    fetchExpenseCategoriesMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: null,
        display_name: 'Sam',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
      {
        id: 'p2',
        group_id: 'g1',
        user_id: null,
        display_name: 'Alex',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);
    createExpenseWithSplitsMock.mockResolvedValue({ id: 'e4' });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ExpenseList groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    await userEvent.type(screen.getByPlaceholderText(/description/i), 'Reimbursement');
    await userEvent.type(screen.getByPlaceholderText(/amount/i), '15.00');

    await userEvent.click(screen.getByRole('button', { name: /adjust/i }));

    const form = screen.getByRole('button', { name: /add expense/i }).closest('form');
    if (!form) {
      throw new Error('Form not found');
    }

    const formSelects = within(form).getAllByRole('combobox');
    await userEvent.selectOptions(formSelects[0], 'p2');
    await userEvent.selectOptions(within(form).getByLabelText(/owes person/i), 'p1');

    await userEvent.click(screen.getByRole('button', { name: /add expense/i }));

    expect(createExpenseWithSplitsMock).toHaveBeenCalledWith({
      groupId: 'g1',
      description: 'Reimbursement',
      amountCents: 1500,
      currency: 'USD',
      categoryId: null,
      expenseDate: new Date().toISOString().slice(0, 10),
      paidByPersonId: 'p2',
      notes: null,
      splitMethod: 'adjustment',
      exactSplits: [{ personId: 'p1', amountCents: 1500 }],
      createdBy: 'user-1',
    });
  });

  it('edits an expense with equal splits', async () => {
    fetchExpensesMock.mockResolvedValue([
      {
        id: 'e1',
        group_id: 'g1',
        description: 'Groceries',
        amount_cents: 2500,
        currency: 'USD',
        category_id: null,
        expense_date: '2024-02-01',
        paid_by_person_id: 'p1',
        split_method: 'equal',
        notes: null,
        created_at: '2024-02-01',
        paid_by_person: { id: 'p1', display_name: 'Sam' },
        category: null,
        receipt_url: null,
      },
    ]);
    fetchExpenseCategoriesMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: null,
        display_name: 'Sam',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
      {
        id: 'p2',
        group_id: 'g1',
        user_id: null,
        display_name: 'Alex',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);
    fetchExpenseSplitsMock.mockResolvedValue([
      { person_id: 'p1', amount_owed_cents: 1250, person: { id: 'p1', display_name: 'Sam' } },
      { person_id: 'p2', amount_owed_cents: 1250, person: { id: 'p2', display_name: 'Alex' } },
    ]);
    updateExpenseWithSplitsMock.mockResolvedValue(undefined);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ExpenseList groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    const expenseItem = await screen.findByText('Groceries');
    const item = expenseItem.closest('li');
    if (!item) {
      throw new Error('Expense item not found');
    }

    await userEvent.click(within(item).getByRole('button', { name: /edit/i }));

    await waitFor(() => {
      expect(fetchExpenseSplitsMock).toHaveBeenCalledWith('e1');
    });

    const editDescription = within(item).getByPlaceholderText('Description');
    await waitFor(() => {
      expect(editDescription).not.toBeDisabled();
    });

    await userEvent.clear(editDescription);
    await userEvent.type(editDescription, 'Groceries updated');

    const editNotes = within(item).getByPlaceholderText(/notes/i);
    await userEvent.clear(editNotes);
    await userEvent.type(editNotes, 'Used promo');

    const editAmount = within(item).getByPlaceholderText('Amount');
    await userEvent.clear(editAmount);
    await userEvent.type(editAmount, '30');

    await userEvent.click(within(item).getByRole('button', { name: /save changes/i }));

    expect(updateExpenseWithSplitsMock).toHaveBeenCalledWith({
      expenseId: 'e1',
      description: 'Groceries updated',
      amountCents: 3000,
      currency: 'USD',
      categoryId: null,
      expenseDate: '2024-02-01',
      paidByPersonId: 'p1',
      notes: 'Used promo',
      splitMethod: 'equal',
      participantIds: ['p1', 'p2'],
    });
  });

  it('shows split details when expanded', async () => {
    fetchExpensesMock.mockResolvedValue([
      {
        id: 'e1',
        group_id: 'g1',
        description: 'Dinner',
        amount_cents: 2500,
        currency: 'USD',
        category_id: null,
        expense_date: '2024-03-01',
        paid_by_person_id: 'p1',
        split_method: 'equal',
        notes: null,
        created_at: '2024-03-01',
        paid_by_person: { id: 'p1', display_name: 'Sam' },
        category: null,
      },
    ]);
    fetchExpenseCategoriesMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: null,
        display_name: 'Sam',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);
    fetchExpenseSplitsMock.mockResolvedValue([
      { person_id: 'p1', amount_owed_cents: 2500, person: { id: 'p1', display_name: 'Sam' } },
    ]);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ExpenseList groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    const expenseItem = await screen.findByText('Dinner');
    const item = expenseItem.closest('li');
    if (!item) {
      throw new Error('Expense item not found');
    }

    await userEvent.click(within(item).getByRole('button', { name: /details/i }));

    await waitFor(() => {
      expect(fetchExpenseSplitsMock).toHaveBeenCalledWith('e1');
    });

    expect(within(item).getByText('Split details')).toBeInTheDocument();
    expect(within(item).getAllByText('$25.00')).toHaveLength(2);
  });

  it('filters expenses by category', async () => {
    fetchExpensesMock.mockResolvedValue([
      {
        id: 'e1',
        group_id: 'g1',
        description: 'Groceries',
        amount_cents: 2000,
        currency: 'USD',
        category_id: 'c2',
        expense_date: '2024-01-02',
        paid_by_person_id: 'p1',
        split_method: 'equal',
        notes: null,
        created_at: '2024-01-02',
        paid_by_person: { id: 'p1', display_name: 'Sam' },
        category: { id: 'c2', name: 'Groceries', icon: null, color: null },
      },
      {
        id: 'e2',
        group_id: 'g1',
        description: 'Utilities',
        amount_cents: 5000,
        currency: 'USD',
        category_id: 'c1',
        expense_date: '2024-01-03',
        paid_by_person_id: 'p1',
        split_method: 'equal',
        notes: null,
        created_at: '2024-01-03',
        paid_by_person: { id: 'p1', display_name: 'Sam' },
        category: { id: 'c1', name: 'Utilities', icon: null, color: null },
      },
    ]);
    fetchExpenseCategoriesMock.mockResolvedValue([
      { id: 'c1', name: 'Utilities', icon: null, color: null },
      { id: 'c2', name: 'Groceries', icon: null, color: null },
    ]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: null,
        display_name: 'Sam',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ExpenseList groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    const list = screen.getByRole('list');
    await waitFor(() => {
      expect(within(list).getAllByText('Groceries').length).toBeGreaterThan(0);
    });
    await userEvent.selectOptions(screen.getByLabelText(/filter by category/i), 'c1');

    expect(within(list).queryAllByText('Groceries').length).toBe(0);
    expect(within(list).getAllByText('Utilities').length).toBeGreaterThan(0);
  });

  it('filters expenses by search query', async () => {
    fetchExpensesMock.mockResolvedValue([
      {
        id: 'e1',
        group_id: 'g1',
        description: 'Groceries',
        amount_cents: 2000,
        currency: 'USD',
        category_id: null,
        expense_date: '2024-01-02',
        paid_by_person_id: 'p1',
        split_method: 'equal',
        notes: null,
        created_at: '2024-01-02',
        paid_by_person: { id: 'p1', display_name: 'Sam' },
        category: null,
      },
      {
        id: 'e2',
        group_id: 'g1',
        description: 'Utilities',
        amount_cents: 5000,
        currency: 'USD',
        category_id: null,
        expense_date: '2024-01-03',
        paid_by_person_id: 'p1',
        split_method: 'equal',
        notes: null,
        created_at: '2024-01-03',
        paid_by_person: { id: 'p1', display_name: 'Sam' },
        category: null,
      },
    ]);
    fetchExpenseCategoriesMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: null,
        display_name: 'Sam',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ExpenseList groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    const list = screen.getByRole('list');
    await waitFor(() => {
      expect(within(list).getAllByText('Groceries').length).toBeGreaterThan(0);
    });

    await userEvent.type(screen.getByLabelText(/search expenses/i), 'util');

    expect(within(list).queryByText('Groceries')).not.toBeInTheDocument();
    expect(within(list).getByText('Utilities')).toBeInTheDocument();
  });

  it('shows expense summary totals by category, payer, and month', async () => {
    fetchExpensesMock.mockResolvedValue([
      {
        id: 'e1',
        group_id: 'g1',
        description: 'Internet',
        amount_cents: 4000,
        currency: 'USD',
        category_id: 'c1',
        expense_date: '2024-03-05',
        paid_by_person_id: 'p1',
        split_method: 'equal',
        notes: null,
        created_at: '2024-03-05',
        paid_by_person: { id: 'p1', display_name: 'Sam' },
        category: { id: 'c1', name: 'Utilities', icon: null, color: null },
      },
      {
        id: 'e2',
        group_id: 'g1',
        description: 'Market',
        amount_cents: 2500,
        currency: 'USD',
        category_id: 'c2',
        expense_date: '2024-03-03',
        paid_by_person_id: 'p2',
        split_method: 'equal',
        notes: null,
        created_at: '2024-03-03',
        paid_by_person: { id: 'p2', display_name: 'Alex' },
        category: { id: 'c2', name: 'Groceries', icon: null, color: null },
      },
      {
        id: 'e3',
        group_id: 'g1',
        description: 'Laundry',
        amount_cents: 1500,
        currency: 'USD',
        category_id: null,
        expense_date: '2024-02-10',
        paid_by_person_id: 'p1',
        split_method: 'equal',
        notes: null,
        created_at: '2024-02-10',
        paid_by_person: { id: 'p1', display_name: 'Sam' },
        category: null,
      },
    ]);
    fetchExpenseCategoriesMock.mockResolvedValue([
      { id: 'c1', name: 'Utilities', icon: null, color: null },
      { id: 'c2', name: 'Groceries', icon: null, color: null },
    ]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: null,
        display_name: 'Sam',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
      {
        id: 'p2',
        group_id: 'g1',
        user_id: null,
        display_name: 'Alex',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ExpenseList groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    await screen.findByText('Internet');

    const summary = screen.getByRole('region', { name: /expense summary/i });

    expect(within(summary).getByText('$80.00')).toBeInTheDocument();

    const utilitiesRow = within(summary).getByText('Utilities').closest('div');
    if (!utilitiesRow) {
      throw new Error('Utilities summary row not found');
    }
    expect(utilitiesRow).toHaveTextContent('$40.00');

    const groceriesRow = within(summary).getByText('Groceries').closest('div');
    if (!groceriesRow) {
      throw new Error('Groceries summary row not found');
    }
    expect(groceriesRow).toHaveTextContent('$25.00');

    const uncategorizedRow = within(summary).getByText('Uncategorized').closest('div');
    if (!uncategorizedRow) {
      throw new Error('Uncategorized summary row not found');
    }
    expect(uncategorizedRow).toHaveTextContent('$15.00');

    const samRow = within(summary).getByText('Sam').closest('div');
    if (!samRow) {
      throw new Error('Sam summary row not found');
    }
    expect(samRow).toHaveTextContent('$55.00');

    const alexRow = within(summary).getByText('Alex').closest('div');
    if (!alexRow) {
      throw new Error('Alex summary row not found');
    }
    expect(alexRow).toHaveTextContent('$25.00');

    const marchRow = within(summary).getByText('2024-03').closest('div');
    if (!marchRow) {
      throw new Error('March summary row not found');
    }
    expect(marchRow).toHaveTextContent('$65.00');

    const febRow = within(summary).getByText('2024-02').closest('div');
    if (!febRow) {
      throw new Error('February summary row not found');
    }
    expect(febRow).toHaveTextContent('$15.00');
  });

  it('uploads a receipt when provided', async () => {
    fetchExpensesMock.mockResolvedValue([]);
    fetchExpenseCategoriesMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: null,
        display_name: 'Sam',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);
    createExpenseWithSplitsMock.mockResolvedValue({ id: 'e1' });
    uploadExpenseReceiptMock.mockResolvedValue('https://example.com/receipt.pdf');
    updateExpenseReceiptMock.mockResolvedValue(undefined);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ExpenseList groupId="g1" groupName="Apartment" currency="USD" />
      </QueryClientProvider>
    );

    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText(/receipt file/i), file);

    await userEvent.type(screen.getByPlaceholderText(/description/i), 'Groceries');
    await userEvent.type(screen.getByPlaceholderText(/amount/i), '25.50');

    await userEvent.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(uploadExpenseReceiptMock).toHaveBeenCalledWith({
        groupId: 'g1',
        expenseId: 'e1',
        file,
      });
      expect(updateExpenseReceiptMock).toHaveBeenCalledWith({
        expenseId: 'e1',
        receiptUrl: 'https://example.com/receipt.pdf',
      });
    });
  });
});
