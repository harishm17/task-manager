import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { LoginPage } from '../pages/LoginPage';

const useAuthMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: false,
}));

describe('LoginPage', () => {
  it('disables sign in when Supabase env is missing', () => {
    useAuthMock.mockReturnValue({ user: null, session: null, loading: false });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/set supabase env vars/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });
});
