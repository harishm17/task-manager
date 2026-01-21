import { render, screen } from '@testing-library/react';
import { ExportPanel } from '../components/ExportPanel';

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: false,
}));

describe('ExportPanel', () => {
  it('shows only task export for personal groups', () => {
    render(<ExportPanel groupId="g1" groupName="Personal" currency="USD" groupType="personal" />);

    expect(screen.getByText(/export tasks csv/i)).toBeInTheDocument();
    expect(screen.queryByText(/export expenses csv/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/export settlements csv/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/export balances csv/i)).not.toBeInTheDocument();
  });

  it('shows all exports for household groups', () => {
    render(<ExportPanel groupId="g2" groupName="Apartment" currency="USD" groupType="household" />);

    expect(screen.getByText(/export tasks csv/i)).toBeInTheDocument();
    expect(screen.getByText(/export expenses csv/i)).toBeInTheDocument();
    expect(screen.getByText(/export settlements csv/i)).toBeInTheDocument();
    expect(screen.getByText(/export balances csv/i)).toBeInTheDocument();
  });
});
