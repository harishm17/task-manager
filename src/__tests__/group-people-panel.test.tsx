import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupPeoplePanel } from '../components/GroupPeoplePanel';

const fetchGroupPeopleMock = vi.fn();
const createGroupPersonMock = vi.fn();

vi.mock('../lib/api/groupPeople', () => ({
  fetchGroupPeople: (...args: unknown[]) => fetchGroupPeopleMock(...args),
  createGroupPerson: (...args: unknown[]) => createGroupPersonMock(...args),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: true,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'person@example.com' } }),
}));

describe('GroupPeoplePanel', () => {
  it('renders group people and adds a person', async () => {
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
    createGroupPersonMock.mockResolvedValue({
      id: 'p2',
      group_id: 'g1',
      user_id: null,
      display_name: 'Alex',
      email: 'alex@example.com',
      created_at: '2024-01-02',
      is_archived: false,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <GroupPeoplePanel groupId="g1" groupName="Apartment" />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Sam')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/name/i), 'Alex');
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'alex@example.com');
    await userEvent.click(screen.getByRole('button', { name: /add person/i }));

    expect(createGroupPersonMock).toHaveBeenCalledWith({
      groupId: 'g1',
      displayName: 'Alex',
      email: 'alex@example.com',
      createdBy: 'user-1',
    });
  });
});
