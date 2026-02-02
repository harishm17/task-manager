import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskList } from '../components/TaskList';

const fetchTasksMock = vi.fn();
const createTaskMock = vi.fn();
const createRecurringTaskMock = vi.fn();
const updateTaskMock = vi.fn();
const deleteTaskMock = vi.fn();
const fetchGroupPeopleMock = vi.fn();

vi.mock('../lib/api/tasks', () => ({
  fetchTasks: (...args: unknown[]) => fetchTasksMock(...args),
  createTask: (...args: unknown[]) => createTaskMock(...args),
  updateTask: (...args: unknown[]) => updateTaskMock(...args),
  deleteTask: (...args: unknown[]) => deleteTaskMock(...args),
}));

vi.mock('../lib/api/recurringTasks', () => ({
  createRecurringTask: (...args: unknown[]) => createRecurringTaskMock(...args),
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

describe('TaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a task', async () => {
    fetchTasksMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: 'user-1',
        display_name: 'Sam',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);
    createTaskMock.mockResolvedValue({
      id: 't1',
      group_id: 'g1',
      title: 'Wash dishes',
      description: null,
      status: 'todo',
      priority: 'medium',
      assigned_to_person_id: null,
      created_by: 'user-1',
      due_date: null,
      completed_at: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <TaskList groupId="g1" isCreating={true} onCancel={() => {}} />
      </QueryClientProvider>
    );

    const assigneeSelect = await screen.findByLabelText(/assign to/i);
    await within(assigneeSelect).findByRole('option', { name: 'Sam' });
    await userEvent.selectOptions(assigneeSelect, 'p1');
    const titleInput = screen.getByLabelText(/task title/i);
    await userEvent.type(titleInput, 'Wash dishes');
    await userEvent.click(screen.getByRole('button', { name: /create task/i }));

    expect(createTaskMock).toHaveBeenCalledWith({
      groupId: 'g1',
      title: 'Wash dishes',
      description: undefined,
      priority: 'medium',
      dueDate: undefined,
      assignedToPersonId: 'p1',
      createdBy: 'user-1',
    });
  });

  it('creates a recurring task when scheduled', async () => {
    fetchTasksMock.mockResolvedValue([]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: 'user-1',
        display_name: 'Sam',
        email: null,
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);
    createRecurringTaskMock.mockResolvedValue({ id: 'rt1' });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <TaskList groupId="g1" isCreating={true} onCancel={() => {}} />
      </QueryClientProvider>
    );

    const assigneeSelect = await screen.findByLabelText(/assign to/i);
    await within(assigneeSelect).findByRole('option', { name: 'Sam' });
    await userEvent.selectOptions(assigneeSelect, 'p1');
    const titleInput = screen.getByLabelText(/task title/i);
    await userEvent.type(titleInput, 'Trash');
    const dueDateInput = screen.getByLabelText(/due date/i);
    await userEvent.type(dueDateInput, '2024-02-01');
    await userEvent.click(screen.getByLabelText(/recurring schedule/i));
    await userEvent.selectOptions(screen.getByDisplayValue('Weekly'), 'monthly');
    const intervalInput = screen.getByLabelText(/every.*interval/i);
    await userEvent.clear(intervalInput);
    await userEvent.type(intervalInput, '2');
    await userEvent.type(screen.getByLabelText(/end date.*optional/i), '2024-06-01');

    await userEvent.click(screen.getByRole('button', { name: /create schedule/i }));

    expect(createRecurringTaskMock).toHaveBeenCalledWith({
      groupId: 'g1',
      title: 'Trash',
      description: undefined,
      frequency: 'monthly',
      interval: 2,
      nextOccurrence: '2024-02-01',
      endDate: '2024-06-01',
      assignedToPersonId: 'p1',
      createdBy: 'user-1',
      priority: 'medium',
    });
    expect(createTaskMock).not.toHaveBeenCalled();
  });

  it('confirms before deleting a task', async () => {
    fetchTasksMock.mockResolvedValue([
      {
        id: 't1',
        group_id: 'g1',
        title: 'Trash',
        description: null,
        status: 'todo',
        priority: 'medium',
        assigned_to_person_id: null,
        created_by: 'user-1',
        due_date: null,
        completed_at: null,
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ]);
    fetchGroupPeopleMock.mockResolvedValue([]);
    deleteTaskMock.mockResolvedValue(undefined);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <TaskList groupId="g1" isCreating={true} onCancel={() => {}} />
      </QueryClientProvider>
    );

    await screen.findByText('Trash');
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(confirmSpy).toHaveBeenCalledWith('Delete this task?');
    expect(deleteTaskMock).toHaveBeenCalledWith('t1', 'user-1');

    confirmSpy.mockRestore();
  });

  it('edits a task', async () => {
    fetchTasksMock.mockResolvedValue([
      {
        id: 't1',
        group_id: 'g1',
        title: 'Trash',
        description: 'Take out',
        status: 'todo',
        priority: 'low',
        assigned_to_person_id: 'p1',
        created_by: 'user-1',
        due_date: '2024-01-10',
        completed_at: null,
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: 'user-1',
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
    updateTaskMock.mockResolvedValue({
      id: 't1',
      group_id: 'g1',
      title: 'Clean kitchen',
      description: 'Deep clean',
      status: 'todo',
      priority: 'high',
      assigned_to_person_id: 'p2',
      created_by: 'user-1',
      due_date: '2024-02-01',
      completed_at: null,
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <TaskList groupId="g1" isCreating={true} onCancel={() => {}} />
      </QueryClientProvider>
    );

    await screen.findByText('Trash');
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    const saveButton = await screen.findByRole('button', { name: /save changes/i });
    const editForm = saveButton.closest('form');
    expect(editForm).not.toBeNull();

    const formScope = within(editForm as HTMLElement);
    const titleInput = formScope.getByLabelText(/task title/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Clean kitchen');
    await userEvent.selectOptions(formScope.getByLabelText(/assign to/i), 'p2');
    await userEvent.selectOptions(formScope.getByLabelText(/priority/i), 'high');
    const dateInput = formScope.getByDisplayValue('2024-01-10');
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2024-02-01');
    const descriptionInput = formScope.getByPlaceholderText(/add details/i);
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, 'Deep clean');

    await userEvent.click(saveButton);

    expect(updateTaskMock).toHaveBeenCalledWith({
      taskId: 't1',
      updates: {
        title: 'Clean kitchen',
        description: 'Deep clean',
        priority: 'high',
        due_date: '2024-02-01',
        assigned_to_person_id: 'p2',
      },
    });
  });

  it('filters tasks by status and search', async () => {
    fetchTasksMock.mockResolvedValue([
      {
        id: 't1',
        group_id: 'g1',
        title: 'Trash',
        description: null,
        status: 'todo',
        priority: 'medium',
        assigned_to_person_id: null,
        created_by: 'user-1',
        due_date: null,
        completed_at: null,
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      {
        id: 't2',
        group_id: 'g1',
        title: 'Laundry',
        description: 'Basement',
        status: 'completed',
        priority: 'high',
        assigned_to_person_id: null,
        created_by: 'user-1',
        due_date: null,
        completed_at: '2024-01-02T10:00:00Z',
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      },
    ]);
    fetchGroupPeopleMock.mockResolvedValue([]);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <TaskList groupId="g1" isCreating={true} onCancel={() => {}} />
      </QueryClientProvider>
    );

    await screen.findByText('Trash');
    const statusSelect = screen.getByDisplayValue('All Statuses');
    await userEvent.selectOptions(statusSelect, 'completed');

    await waitFor(() => {
      expect(screen.queryByText('Trash')).not.toBeInTheDocument();
      expect(screen.getByText('Laundry')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search tasks/i);
    await userEvent.type(searchInput, 'lau');
    await waitFor(() => {
      expect(screen.getByText('Laundry')).toBeInTheDocument();
    });
  });
});
