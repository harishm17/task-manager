import { toCsv } from '../lib/csv';
import {
  buildBalanceExportRows,
  buildExpenseExportRows,
  buildSettlementExportRows,
  buildTaskExportRows,
} from '../lib/exports';
import type { ExpenseWithSplits } from '../lib/api/expenses';
import type { Settlement } from '../lib/api/settlements';
import type { BalanceRow } from '../lib/api/balances';
import type { TaskWithAssignee } from '../lib/api/tasks';

describe('toCsv', () => {
  it('escapes commas and quotes', () => {
    const rows = [{ Name: 'Sam, "A"', Note: 'Line1\nLine2', Amount: 12 }];
    const csv = toCsv(rows, ['Name', 'Note', 'Amount']);

    expect(csv).toBe('Name,Note,Amount\n"Sam, ""A""","Line1\nLine2",12');
  });
});

describe('buildExpenseExportRows', () => {
  it('formats split details', () => {
    const expenses: ExpenseWithSplits[] = [
      {
        id: 'e1',
        group_id: 'g1',
        description: 'Groceries',
        amount_cents: 1234,
        currency: 'USD',
        category_id: 'c1',
        expense_date: '2024-01-02',
        paid_by_person_id: 'p1',
        split_method: 'equal',
        receipt_url: null,
        notes: 'Paid back later',
        created_at: '2024-01-02T10:00:00Z',
        paid_by_person: { id: 'p1', display_name: 'Sam' },
        category: { id: 'c1', name: 'Groceries', icon: null, color: null },
        splits: [
          { person_id: 'p1', amount_owed_cents: 617, person: { id: 'p1', display_name: 'Sam' } },
          { person_id: 'p2', amount_owed_cents: 617, person: { id: 'p2', display_name: 'Alex' } },
        ],
      },
    ];

    const rows = buildExpenseExportRows(expenses);

    expect(rows[0].Amount).toBe('12.34');
    expect(rows[0].Category).toBe('Groceries');
    expect(rows[0]['Paid By']).toBe('Sam');
    expect(rows[0].Notes).toBe('Paid back later');
    expect(rows[0]['Split Details']).toBe('Sam: 6.17; Alex: 6.17');
  });
});

describe('buildSettlementExportRows', () => {
  it('maps settlement fields', () => {
    const settlements: Settlement[] = [
      {
        id: 's1',
        group_id: 'g1',
        from_person_id: 'p1',
        to_person_id: 'p2',
        amount_cents: 2500,
        currency: 'USD',
        payment_method: 'Venmo',
        notes: 'Utilities',
        settled_at: '2024-01-05T12:00:00Z',
        from_person: { id: 'p1', display_name: 'Sam' },
        to_person: { id: 'p2', display_name: 'Alex' },
      },
    ];

    const rows = buildSettlementExportRows(settlements);

    expect(rows[0].Amount).toBe('25.00');
    expect(rows[0].From).toBe('Sam');
    expect(rows[0].To).toBe('Alex');
  });
});

describe('buildBalanceExportRows', () => {
  it('formats signed balances and status', () => {
    const balances: BalanceRow[] = [
      { personId: 'p1', displayName: 'Sam', userId: null, netCents: 500 },
      { personId: 'p2', displayName: 'Alex', userId: null, netCents: -500 },
      { personId: 'p3', displayName: 'Taylor', userId: null, netCents: 0 },
    ];

    const rows = buildBalanceExportRows(balances, 'USD');

    expect(rows[0]['Net Amount']).toBe('+5.00');
    expect(rows[0].Status).toBe('owed to them');
    expect(rows[1]['Net Amount']).toBe('-5.00');
    expect(rows[1].Status).toBe('owes');
    expect(rows[2]['Net Amount']).toBe('0.00');
    expect(rows[2].Status).toBe('settled');
  });
});

describe('buildTaskExportRows', () => {
  it('maps task fields', () => {
    const tasks: TaskWithAssignee[] = [
      {
        id: 't1',
        group_id: 'g1',
        title: 'Take out trash',
        description: 'Kitchen bin',
        status: 'todo',
        priority: 'high',
        assigned_to_person_id: 'p1',
        created_by: 'u1',
        due_date: '2024-01-03',
        completed_at: null,
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        assigned_person: { id: 'p1', display_name: 'Sam' },
      },
    ];

    const rows = buildTaskExportRows(tasks);

    expect(rows[0].Title).toBe('Take out trash');
    expect(rows[0].Status).toBe('todo');
    expect(rows[0].Priority).toBe('high');
    expect(rows[0]['Assigned To']).toBe('Sam');
  });
});
