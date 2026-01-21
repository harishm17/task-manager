import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupMembersPanel } from '../components/GroupMembersPanel';

const fetchGroupMembersMock = vi.fn();
const fetchGroupPeopleMock = vi.fn();
const updateGroupMemberRoleMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('../lib/api/groupMembers', () => ({
  fetchGroupMembers: (...args: unknown[]) => fetchGroupMembersMock(...args),
  updateGroupMemberRole: (...args: unknown[]) => updateGroupMemberRoleMock(...args),
}));

vi.mock('../lib/api/groupPeople', () => ({
  fetchGroupPeople: (...args: unknown[]) => fetchGroupPeopleMock(...args),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: true,
}));

describe('GroupMembersPanel', () => {
  it('updates a member role', async () => {
    fetchGroupMembersMock.mockResolvedValue([
      { user_id: 'u1', role: 'admin' },
      { user_id: 'u2', role: 'member' },
    ]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: 'u1',
        display_name: 'Sam',
        email: 'sam@example.com',
        created_at: '2024-01-01',
        is_archived: false,
      },
      {
        id: 'p2',
        group_id: 'g1',
        user_id: 'u2',
        display_name: 'Alex',
        email: 'alex@example.com',
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);
    updateGroupMemberRoleMock.mockResolvedValue({ user_id: 'u2', role: 'admin' });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <GroupMembersPanel groupId="g1" groupName="Apartment" />
      </QueryClientProvider>
    );

    const alexRow = await screen.findByText('Alex');
    const alexSelect = within(alexRow.closest('li') as HTMLElement).getByRole('combobox');
    await userEvent.selectOptions(alexSelect, 'admin');

    await waitFor(() => {
      expect(updateGroupMemberRoleMock).toHaveBeenCalledWith({
        groupId: 'g1',
        userId: 'u2',
        role: 'admin',
      });
    });
  });

  it('prevents demoting the last admin', async () => {
    fetchGroupMembersMock.mockResolvedValue([{ user_id: 'u1', role: 'admin' }]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: 'u1',
        display_name: 'Sam',
        email: 'sam@example.com',
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <GroupMembersPanel groupId="g1" groupName="Apartment" />
      </QueryClientProvider>
    );

    expect(await screen.findByText(/assign another admin before demoting yourself/i)).toBeInTheDocument();
    const samRow = screen.getByText(/Sam/);
    const samSelect = within(samRow.closest('li') as HTMLElement).getByRole('combobox');
    expect(samSelect).toBeDisabled();
  });

  it('disables role changes for non-admins', async () => {
    fetchGroupMembersMock.mockResolvedValue([
      { user_id: 'u1', role: 'member' },
      { user_id: 'u2', role: 'admin' },
    ]);
    fetchGroupPeopleMock.mockResolvedValue([
      {
        id: 'p1',
        group_id: 'g1',
        user_id: 'u1',
        display_name: 'Sam',
        email: 'sam@example.com',
        created_at: '2024-01-01',
        is_archived: false,
      },
      {
        id: 'p2',
        group_id: 'g1',
        user_id: 'u2',
        display_name: 'Alex',
        email: 'alex@example.com',
        created_at: '2024-01-01',
        is_archived: false,
      },
    ]);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <GroupMembersPanel groupId="g1" groupName="Apartment" />
      </QueryClientProvider>
    );

    await screen.findByText(/Sam \(You\)/);

    for (const select of screen.getAllByRole('combobox')) {
      expect(select).toBeDisabled();
    }
    expect(screen.getByText(/only admins can change member roles/i)).toBeInTheDocument();
  });
});
