import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupSwitcher } from '../components/GroupSwitcher';

const setActiveGroupIdMock = vi.fn();
const createHouseholdGroupMock = vi.fn();

vi.mock('../contexts/GroupContext', () => ({
  useGroups: () => ({
    groups: [
      { id: 'g1', name: 'Personal', type: 'personal', default_currency: 'USD' },
      { id: 'g2', name: 'Apartment 4B', type: 'household', default_currency: 'USD' },
    ],
    activeGroup: { id: 'g1', name: 'Personal', type: 'personal', default_currency: 'USD' },
    loading: false,
    error: null,
    setActiveGroupId: setActiveGroupIdMock,
    refreshGroups: vi.fn(),
    createHouseholdGroup: createHouseholdGroupMock,
  }),
}));

describe('GroupSwitcher', () => {
  it('shows the active group', () => {
    render(<GroupSwitcher />);
    expect(screen.getByRole('button', { name: /personal/i })).toBeInTheDocument();
  });

  it('updates active group on selection', async () => {
    render(<GroupSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: /personal/i }));
    await userEvent.click(screen.getByRole('button', { name: /apartment 4b/i }));

    expect(setActiveGroupIdMock).toHaveBeenCalledWith('g2');
  });

  it('submits create household group form', async () => {
    createHouseholdGroupMock.mockResolvedValue({ error: null, group: { id: 'g3' } });

    render(<GroupSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: /personal/i }));
    await userEvent.click(screen.getByRole('button', { name: /create household group/i }));

    const input = screen.getByPlaceholderText(/group name/i);
    await userEvent.type(input, 'New Place');

    await userEvent.click(screen.getByRole('button', { name: /create group/i }));

    expect(createHouseholdGroupMock).toHaveBeenCalledWith('New Place');
  });
});
