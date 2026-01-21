import { render, screen } from '@testing-library/react';
import { GroupProvider, useGroups } from '../contexts/GroupContext';

const fetchGroupsMock = vi.fn();
const createPersonalGroupMock = vi.fn();

vi.mock('../lib/api/groups', () => ({
  fetchGroups: (...args: unknown[]) => fetchGroupsMock(...args),
  createPersonalGroup: (...args: unknown[]) => createPersonalGroupMock(...args),
  createHouseholdGroup: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'test@example.com' } }),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: true,
}));

function GroupsConsumer() {
  const { groups, loading } = useGroups();
  if (loading) return <div>Loading</div>;
  return <div>{groups.map((group) => group.name).join(', ')}</div>;
}

describe('GroupProvider', () => {
  it('creates a personal group if missing', async () => {
    fetchGroupsMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: 'g1', name: 'Personal', type: 'personal', default_currency: 'USD' },
    ]);
    createPersonalGroupMock.mockResolvedValue({
      id: 'g1',
      name: 'Personal',
      type: 'personal',
      default_currency: 'USD',
    });

    render(
      <GroupProvider>
        <GroupsConsumer />
      </GroupProvider>
    );

    expect(await screen.findByText('Personal')).toBeInTheDocument();
    expect(createPersonalGroupMock).toHaveBeenCalledWith({
      userEmail: 'test@example.com',
    });
  });
});
