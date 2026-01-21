import { useState } from 'react';
import { fetchBalanceInputs, computeNetBalances } from '../lib/api/balances';
import { fetchExpensesWithSplits } from '../lib/api/expenses';
import { fetchGroupPeople } from '../lib/api/groupPeople';
import { fetchSettlements } from '../lib/api/settlements';
import { fetchTasksWithAssignee } from '../lib/api/tasks';
import { downloadCsv, toCsv } from '../lib/csv';
import {
  BALANCE_EXPORT_HEADERS,
  EXPENSE_EXPORT_HEADERS,
  SETTLEMENT_EXPORT_HEADERS,
  TASK_EXPORT_HEADERS,
  buildBalanceExportRows,
  buildExpenseExportRows,
  buildSettlementExportRows,
  buildTaskExportRows,
} from '../lib/exports';
import { APP_NAME } from '../lib/constants';
import { hasSupabaseEnv } from '../lib/supabaseClient';

type ExportPanelProps = {
  groupId: string;
  groupName: string;
  currency: string;
  groupType: 'personal' | 'household';
};

type ExportKind = 'tasks' | 'expenses' | 'settlements' | 'balances';

const exportLabels: Record<ExportKind, string> = {
  tasks: 'Export tasks CSV',
  expenses: 'Export expenses CSV',
  settlements: 'Export settlements CSV',
  balances: 'Export balances CSV',
};

const slugify = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'group';
};

export function ExportPanel({ groupId, groupName, currency, groupType }: ExportPanelProps) {
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exportKinds: ExportKind[] =
    groupType === 'household' ? ['tasks', 'expenses', 'settlements', 'balances'] : ['tasks'];

  const handleExport = async (kind: ExportKind) => {
    setError(null);
    if (!hasSupabaseEnv) {
      setError('Set Supabase env vars to enable exports.');
      return;
    }

    setExporting(kind);
    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const baseName = `${APP_NAME.toLowerCase()}-${slugify(groupName)}-${kind}-${dateStamp}.csv`;

      if (kind === 'tasks') {
        const tasks = await fetchTasksWithAssignee(groupId);
        const rows = buildTaskExportRows(tasks);
        const csv = toCsv(rows, TASK_EXPORT_HEADERS);
        downloadCsv(baseName, csv);
        return;
      }

      if (kind === 'expenses') {
        const expenses = await fetchExpensesWithSplits(groupId);
        const rows = buildExpenseExportRows(expenses);
        const csv = toCsv(rows, EXPENSE_EXPORT_HEADERS);
        downloadCsv(baseName, csv);
        return;
      }

      if (kind === 'settlements') {
        const settlements = await fetchSettlements(groupId);
        const rows = buildSettlementExportRows(settlements);
        const csv = toCsv(rows, SETTLEMENT_EXPORT_HEADERS);
        downloadCsv(baseName, csv);
        return;
      }

      const people = await fetchGroupPeople(groupId);
      const balanceInputs = await fetchBalanceInputs(groupId);
      const balances = computeNetBalances(people, balanceInputs.expenses, balanceInputs.splits, balanceInputs.settlements);
      const rows = buildBalanceExportRows(balances, currency);
      const csv = toCsv(rows, BALANCE_EXPORT_HEADERS);
      downloadCsv(baseName, csv);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed.';
      setError(message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Export data</p>
          <p className="text-sm text-slate-600">
            Download tasks{groupType === 'household' ? ', expenses, settlements, or balances' : ''} for this group.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {exportKinds.map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={!hasSupabaseEnv || exporting !== null}
              onClick={() => handleExport(kind)}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {exporting === kind ? 'Exporting...' : exportLabels[kind]}
            </button>
          ))}
        </div>
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        {!hasSupabaseEnv ? (
          <p className="text-xs text-amber-600">Set Supabase env vars to enable exports.</p>
        ) : null}
      </div>
    </section>
  );
}
