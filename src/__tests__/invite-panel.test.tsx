import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvitePanel } from '../components/InvitePanel';

const fetchInvitationsMock = vi.fn();
const createInvitationMock = vi.fn();
const fetchGroupRoleMock = vi.fn();

vi.mock('../lib/api/invitations', () => ({
  fetchInvitations: (...args: unknown[]) => fetchInvitationsMock(...args),
  createInvitation: (...args: unknown[]) => createInvitationMock(...args),
}));

vi.mock('../lib/api/groupMembers', () => ({
  fetchGroupRole: (...args: unknown[]) => fetchGroupRoleMock(...args),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: true,
}));

describe('InvitePanel', () => {
  it('creates an invite', async () => {
    fetchInvitationsMock.mockResolvedValue([]);
    fetchGroupRoleMock.mockResolvedValue('admin');
    createInvitationMock.mockResolvedValue({
      id: 'i1',
      group_id: 'g1',
      email: null,
      token: 'token123',
      status: 'pending',
      expires_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <InvitePanel groupId="g1" groupName="Apartment" />
      </QueryClientProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: /create invite/i }));

    expect(createInvitationMock).toHaveBeenCalledWith({
      groupId: 'g1',
      email: undefined,
      invitedBy: 'u1',
    });
  });

  it('disables invites for non-admins', async () => {
    fetchInvitationsMock.mockResolvedValue([]);
    fetchGroupRoleMock.mockResolvedValue('member');

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <InvitePanel groupId="g1" groupName="Apartment" />
      </QueryClientProvider>
    );

    const button = await screen.findByRole('button', { name: /create invite/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/only admins can create invites/i)).toBeInTheDocument();
  });
});
