import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from '../pages/SettingsPage';

const fetchUserProfileMock = vi.fn();
const updateUserProfileMock = vi.fn();
const fetchGroupRoleMock = vi.fn();
const fetchGroupMembersMock = vi.fn();
const leaveGroupMock = vi.fn();

const signOutMock = vi.fn().mockResolvedValue({ error: null });

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'test@example.com' }, signOut: signOutMock, loading: false }),
}));

vi.mock('../contexts/GroupContext', () => ({
  useGroups: () => ({
    activeGroup: { id: 'g1', name: 'Personal', type: 'personal', default_currency: 'USD' },
    groups: [{ id: 'g1', name: 'Personal', type: 'personal', default_currency: 'USD' }],
  }),
}));

vi.mock('../lib/api/users', () => ({
  fetchUserProfile: (...args: unknown[]) => fetchUserProfileMock(...args),
  updateUserProfile: (...args: unknown[]) => updateUserProfileMock(...args),
}));

vi.mock('../lib/api/groupMembers', () => ({
  fetchGroupRole: (...args: unknown[]) => fetchGroupRoleMock(...args),
  fetchGroupMembers: (...args: unknown[]) => fetchGroupMembersMock(...args),
  leaveGroup: (...args: unknown[]) => leaveGroupMock(...args),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: true,
}));

describe('SettingsPage', () => {
  it('renders user info and triggers sign out', async () => {
    fetchUserProfileMock.mockResolvedValue({
      id: 'u1',
      email: 'test@example.com',
      name: 'Sam',
      avatar_url: null,
    });
    fetchGroupRoleMock.mockResolvedValue('admin');
    fetchGroupMembersMock.mockResolvedValue([]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /sign out/i });
    await userEvent.click(button);

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('updates profile details', async () => {
    fetchUserProfileMock.mockResolvedValue({
      id: 'u1',
      email: 'test@example.com',
      name: 'Sam',
      avatar_url: null,
    });
    fetchGroupRoleMock.mockResolvedValue('admin');
    fetchGroupMembersMock.mockResolvedValue([]);
    updateUserProfileMock.mockResolvedValue({
      id: 'u1',
      email: 'test@example.com',
      name: 'Samuel',
      avatar_url: null,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    const nameInput = await screen.findByLabelText(/display name/i);
    await waitFor(() => {
      expect(nameInput).toHaveValue('Sam');
    });
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Samuel');

    await userEvent.click(screen.getByRole('button', { name: /save profile/i }));

    expect(updateUserProfileMock).toHaveBeenCalledWith('u1', {
      name: 'Samuel',
      avatarUrl: null,
    });
  });
});
