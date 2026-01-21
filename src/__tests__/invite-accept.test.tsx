import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { InviteAcceptPage } from '../pages/InviteAcceptPage';

const acceptInvitationMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../lib/api/invitations', () => ({
  acceptInvitation: (...args: unknown[]) => acceptInvitationMock(...args),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

describe('InviteAcceptPage', () => {
  it('prompts login when unauthenticated', () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });

    render(
      <MemoryRouter initialEntries={['/invite/token123']}>
        <Routes>
          <Route path="/invite/:token" element={<InviteAcceptPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/sign in to accept/i)).toBeInTheDocument();
  });

  it('calls acceptInvitation when authenticated', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' }, loading: false });
    acceptInvitationMock.mockResolvedValue({ groupId: 'g1' });

    render(
      <MemoryRouter initialEntries={['/invite/token123']}>
        <Routes>
          <Route path="/invite/:token" element={<InviteAcceptPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(acceptInvitationMock).toHaveBeenCalledWith('token123');
    });
  });
});
