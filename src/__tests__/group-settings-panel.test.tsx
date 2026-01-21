import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupSettingsPanel } from '../components/GroupSettingsPanel';

const updateGroupNameMock = vi.fn();
const deleteGroupMock = vi.fn();
const fetchGroupRoleMock = vi.fn();
const fetchGroupMembersMock = vi.fn();
const leaveGroupMock = vi.fn();
const refreshGroupsMock = vi.fn().mockResolvedValue(undefined);
const setActiveGroupIdMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('../contexts/GroupContext', () => ({
  useGroups: () => ({
    groups: [
      { id: 'g1', name: 'Apartment', type: 'household', default_currency: 'USD' },
      { id: 'g2', name: 'Personal', type: 'personal', default_currency: 'USD' },
    ],
    refreshGroups: refreshGroupsMock,
    setActiveGroupId: setActiveGroupIdMock,
  }),
}));

vi.mock('../lib/api/groups', () => ({
  updateGroupName: (...args: unknown[]) => updateGroupNameMock(...args),
  deleteGroup: (...args: unknown[]) => deleteGroupMock(...args),
}));

vi.mock('../lib/api/groupMembers', () => ({
  fetchGroupRole: (...args: unknown[]) => fetchGroupRoleMock(...args),
  fetchGroupMembers: (...args: unknown[]) => fetchGroupMembersMock(...args),
  leaveGroup: (...args: unknown[]) => leaveGroupMock(...args),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: true,
}));

describe('GroupSettingsPanel', () => {
  it('renames the group when admin', async () => {
    fetchGroupRoleMock.mockResolvedValue('admin');
    fetchGroupMembersMock.mockResolvedValue([
      { user_id: 'u1', role: 'admin' },
      { user_id: 'u2', role: 'admin' },
    ]);
    updateGroupNameMock.mockResolvedValue({
      id: 'g1',
      name: 'New Name',
      type: 'household',
      default_currency: 'USD',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <GroupSettingsPanel groupId="g1" groupName="Apartment" groupType="household" />
      </QueryClientProvider>
    );

    const nameInput = await screen.findByLabelText(/group name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Name');
    await userEvent.click(screen.getByRole('button', { name: /save name/i }));

    expect(updateGroupNameMock).toHaveBeenCalledWith({ groupId: 'g1', name: 'New Name' });
    await waitFor(() => {
      expect(refreshGroupsMock).toHaveBeenCalled();
    });
  });

  it('disables leaving when last admin', async () => {
    fetchGroupRoleMock.mockResolvedValue('admin');
    fetchGroupMembersMock.mockResolvedValue([{ user_id: 'u1', role: 'admin' }]);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <GroupSettingsPanel groupId="g1" groupName="Apartment" groupType="household" />
      </QueryClientProvider>
    );

    expect(await screen.findByText(/add another admin before leaving/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /leave group/i })).toBeDisabled();
  });

  it('deletes the group when admin', async () => {
    fetchGroupRoleMock.mockResolvedValue('admin');
    fetchGroupMembersMock.mockResolvedValue([
      { user_id: 'u1', role: 'admin' },
      { user_id: 'u2', role: 'member' },
    ]);
    deleteGroupMock.mockResolvedValue(undefined);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <GroupSettingsPanel groupId="g1" groupName="Apartment" groupType="household" />
      </QueryClientProvider>
    );

    const deleteButton = await screen.findByRole('button', { name: /delete group/i });
    await userEvent.click(deleteButton);

    expect(deleteGroupMock).toHaveBeenCalledWith('g1');
    await waitFor(() => {
      expect(refreshGroupsMock).toHaveBeenCalled();
      expect(setActiveGroupIdMock).toHaveBeenCalledWith('g2');
    });

    confirmSpy.mockRestore();
  });

  it('disables admin actions for non-admins', async () => {
    fetchGroupRoleMock.mockResolvedValue('member');
    fetchGroupMembersMock.mockResolvedValue([
      { user_id: 'u1', role: 'member' },
      { user_id: 'u2', role: 'admin' },
    ]);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <GroupSettingsPanel groupId="g1" groupName="Apartment" groupType="household" />
      </QueryClientProvider>
    );

    const nameInput = await screen.findByLabelText(/group name/i);
    expect(nameInput).toBeEnabled();
    expect(screen.getByRole('button', { name: /save name/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete group/i })).toBeDisabled();
    expect(screen.getByText(/only admins can rename this group/i)).toBeInTheDocument();
    expect(screen.getByText(/only admins can delete this group/i)).toBeInTheDocument();
  });
});
