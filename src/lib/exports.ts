import type { BalanceRow } from './api/balances';
import type { ExpenseWithSplits } from './api/expenses';
import type { Settlement } from './api/settlements';
import type { TaskWithAssignee } from './api/tasks';
import type { CsvRow } from './csv';

export const EXPENSE_EXPORT_HEADERS = [
  'Date',
  'Description',
  'Notes',
  'Amount',
  'Currency',
  'Category',
  'Paid By',
  'Split Method',
  'Split Details',
];

export const SETTLEMENT_EXPORT_HEADERS = [
  'Date',
  'From',
  'To',
  'Amount',
  'Currency',
  'Payment Method',
  'Notes',
];

export const BALANCE_EXPORT_HEADERS = ['Person', 'Net Amount', 'Currency', 'Status'];
export const TASK_EXPORT_HEADERS = [
  'Created',
  'Title',
  'Description',
  'Status',
  'Priority',
  'Due Date',
  'Assigned To',
];

const formatCents = (amountCents: number) => (amountCents / 100).toFixed(2);

const formatSignedCents = (amountCents: number) => {
  if (amountCents === 0) return '0.00';
  const formatted = formatCents(Math.abs(amountCents));
  return amountCents > 0 ? `+${formatted}` : `-${formatted}`;
};

export const buildExpenseExportRows = (expenses: ExpenseWithSplits[]): CsvRow[] =>
  expenses.map((expense) => {
    const splitDetails = (expense.splits ?? [])
      .map((split) => {
        const name = split.person?.display_name ?? 'Unknown';
        return `${name}: ${formatCents(split.amount_owed_cents)}`;
      })
      .join('; ');

    return {
      Date: expense.expense_date,
      Description: expense.description,
      Notes: expense.notes ?? '',
      Amount: formatCents(expense.amount_cents),
      Currency: expense.currency,
      Category: expense.category?.name ?? '',
      'Paid By': expense.paid_by_person?.display_name ?? '',
      'Split Method': expense.split_method,
      'Split Details': splitDetails,
    };
  });

export const buildSettlementExportRows = (settlements: Settlement[]): CsvRow[] =>
  settlements.map((settlement) => ({
    Date: settlement.settled_at,
    From: settlement.from_person?.display_name ?? '',
    To: settlement.to_person?.display_name ?? '',
    Amount: formatCents(settlement.amount_cents),
    Currency: settlement.currency,
    'Payment Method': settlement.payment_method ?? '',
    Notes: settlement.notes ?? '',
  }));

export const buildBalanceExportRows = (balances: BalanceRow[], currency: string): CsvRow[] =>
  balances.map((balance) => {
    let status = 'settled';
    if (balance.netCents > 0) {
      status = 'owed to them';
    } else if (balance.netCents < 0) {
      status = 'owes';
    }

    return {
      Person: balance.displayName,
      'Net Amount': formatSignedCents(balance.netCents),
      Currency: currency,
      Status: status,
    };
  });

export const buildTaskExportRows = (tasks: TaskWithAssignee[]): CsvRow[] =>
  tasks.map((task) => ({
    Created: task.created_at,
    Title: task.title,
    Description: task.description ?? '',
    Status: task.status,
    Priority: task.priority,
    'Due Date': task.due_date ?? '',
    'Assigned To': task.assigned_person?.display_name ?? '',
  }));
