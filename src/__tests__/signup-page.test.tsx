import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupPage } from '../pages/SignupPage';

const signUpMock = vi.fn();
let hasEnv = true;

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../lib/supabaseClient', () => ({
  get hasSupabaseEnv() {
    return hasEnv;
  },
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => signUpMock(...args),
    },
  },
}));

describe('SignupPage', () => {
  beforeEach(() => {
    signUpMock.mockReset();
    hasEnv = true;
  });

  it('blocks sign up when Supabase env is missing', () => {
    hasEnv = false;

    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/set supabase env vars/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  it('validates password confirmation', async () => {
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/you@example.com/i), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText(/create a password/i), 'password123');
    await userEvent.type(screen.getByPlaceholderText(/re-enter password/i), 'password456');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('submits signup to Supabase', async () => {
    signUpMock.mockResolvedValue({ error: null });

    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/you@example.com/i), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText(/create a password/i), 'password123');
    await userEvent.type(screen.getByPlaceholderText(/re-enter password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(await screen.findByText(/check your email to confirm/i)).toBeInTheDocument();
  });
});
