import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecurringTaskPanel } from '../components/RecurringTaskPanel';
import { getTodayDateString } from '../lib/recurring';

const fetchGroupPeopleMock = vi.fn();
const fetchRecurringTasksMock = vi.fn();
const createRecurringTaskMock = vi.fn();
const updateRecurringTaskMock = vi.fn();
const createTaskMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('../lib/api/groupPeople', () => ({
  fetchGroupPeople: (...args: unknown[]) => fetchGroupPeopleMock(...args),
}));

vi.mock('../lib/api/recurringTasks', () => ({
  fetchRecurringTasks: (...args: unknown[]) => fetchRecurringTasksMock(...args),
  createRecurringTask: (...args: unknown[]) => createRecurringTaskMock(...args),
  updateRecurringTask: (...args: unknown[]) => updateRecurringTaskMock(...args),
}));

vi.mock('../lib/api/tasks', () => ({
  createTask: (...args: unknown[]) => createTaskMock(...args),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: true,
}));

describe('RecurringTaskPanel', () => {
  it('generates tasks for due templates', async () => {
    const today = getTodayDateString();
    fetchGroupPeopleMock.mockResolvedValue([]);
    fetchRecurringTasksMock.mockResolvedValue([
      {
        id: 'r1',
        group_id: 'g1',
        title: 'Trash',
        description: null,
        priority: 'medium',
        frequency: 'daily',
        interval: 1,
        assigned_to_person_id: null,
        next_occurrence: today,
        end_date: null,
        is_active: true,
        created_by: 'u1',
        created_at: today,
      },
    ]);
    createTaskMock.mockResolvedValue({ id: 't1' });
    updateRecurringTaskMock.mockResolvedValue(undefined);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <RecurringTaskPanel groupId="g1" />
      </QueryClientProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: /generate due tasks/i }));

    await waitFor(() => {
      expect(createTaskMock).toHaveBeenCalled();
      expect(updateRecurringTaskMock).toHaveBeenCalledWith({
        recurringTaskId: 'r1',
        updates: expect.objectContaining({ is_active: true }),
      });
    });
  });

  it('closes templates when end date has passed', async () => {
    fetchGroupPeopleMock.mockResolvedValue([]);
    fetchRecurringTasksMock.mockResolvedValue([
      {
        id: 'r1',
        group_id: 'g1',
        title: 'Trash',
        description: null,
        priority: 'medium',
        frequency: 'monthly',
        interval: 1,
        assigned_to_person_id: null,
        next_occurrence: '2024-02-01',
        end_date: '2024-01-15',
        is_active: true,
        created_by: 'u1',
        created_at: '2024-01-01',
      },
    ]);
    createTaskMock.mockResolvedValue({ id: 't1' });
    updateRecurringTaskMock.mockResolvedValue(undefined);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <RecurringTaskPanel groupId="g1" />
      </QueryClientProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: /generate due tasks/i }));

    await waitFor(() => {
      expect(updateRecurringTaskMock).toHaveBeenCalledWith({
        recurringTaskId: 'r1',
        updates: {
          next_occurrence: '2024-02-01',
          is_active: false,
        },
      });
    });
  });
});
