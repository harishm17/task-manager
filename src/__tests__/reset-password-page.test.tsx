import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: false,
}));

describe('ResetPasswordPage', () => {
  it('disables reset when Supabase env is missing', () => {
    render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/set supabase env vars/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeDisabled();
  });
});
