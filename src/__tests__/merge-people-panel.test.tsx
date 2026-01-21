import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MergePeoplePanel } from '../components/MergePeoplePanel';

const fetchGroupPeopleMock = vi.fn();
const fetchGroupRoleMock = vi.fn();
const fetchMergeAuditMock = vi.fn();
const mergePeopleMock = vi.fn();

vi.mock('../lib/api/groupPeople', () => ({
  fetchGroupPeople: (...args: unknown[]) => fetchGroupPeopleMock(...args),
}));

vi.mock('../lib/api/groupMembers', () => ({
  fetchGroupRole: (...args: unknown[]) => fetchGroupRoleMock(...args),
}));

vi.mock('../lib/api/mergePeople', () => ({
  fetchMergeAudit: (...args: unknown[]) => fetchMergeAuditMock(...args),
  mergePeople: (...args: unknown[]) => mergePeopleMock(...args),
}));

vi.mock('../lib/supabaseClient', () => ({
  hasSupabaseEnv: true,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

describe('MergePeoplePanel', () => {
  it('merges source into target when admin', async () => {
    fetchGroupRoleMock.mockResolvedValue('admin');
    fetchGroupPeopleMock.mockResolvedValue([
      { id: 'p1', display_name: 'Alex', user_id: null },
      { id: 'p2', display_name: 'Sam', user_id: 'u2' },
    ]);
    fetchMergeAuditMock.mockResolvedValue([]);
    mergePeopleMock.mockResolvedValue({ success: true });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MergePeoplePanel groupId="g1" groupName="Apartment" />
      </QueryClientProvider>
    );

    await screen.findByRole('option', { name: 'Alex' }, { timeout: 3000 });
    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[0], 'p1');
    await userEvent.selectOptions(selects[1], 'p2');
    await userEvent.click(screen.getByRole('button', { name: /merge/i }));

    expect(mergePeopleMock).toHaveBeenCalledWith({
      groupId: 'g1',
      sourcePersonId: 'p1',
      targetPersonId: 'p2',
    });
  });
});
