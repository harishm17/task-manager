import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { RequireAuth } from '../components/RequireAuth';

const useAuthMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

describe('RequireAuth', () => {
  it('shows loading state while auth is resolving', () => {
    useAuthMock.mockReturnValue({ user: null, session: null, loading: true });

    render(
      <MemoryRouter>
        <RequireAuth>
          <div>Secret</div>
        </RequireAuth>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('redirects to login when unauthenticated', () => {
    useAuthMock.mockReturnValue({ user: null, session: null, loading: false });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Screen</div>} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <div>Dashboard</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/login screen/i)).toBeInTheDocument();
  });

  it('renders children for authenticated users', () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' }, session: null, loading: false });

    render(
      <MemoryRouter>
        <RequireAuth>
          <div>Dashboard</div>
        </RequireAuth>
      </MemoryRouter>
    );

    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });
});
