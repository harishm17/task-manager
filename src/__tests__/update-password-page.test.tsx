import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdatePasswordPage } from '../pages/UpdatePasswordPage';

const useAuthMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: true,
  supabase: {
    auth: {
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe('UpdatePasswordPage', () => {
  it('requires a recovery session to update password', async () => {
    useAuthMock.mockReturnValue({ user: null, session: null, loading: false });

    render(
      <MemoryRouter>
        <UpdatePasswordPage />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/new password/i), 'newpassword');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpassword');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(screen.getByText(/open the password reset link/i)).toBeInTheDocument();
  });
});
