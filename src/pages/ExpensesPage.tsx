import { ExpenseList } from '../components/ExpenseList';
import { RecurringExpensePanel } from '../components/RecurringExpensePanel';
import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useGroups } from '../contexts/GroupContext';

export function ExpensesPage() {
  const { activeGroup } = useGroups();
  const [isCreating, setIsCreating] = useState(false);
  const isHousehold = activeGroup?.type === 'household';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Log receipts, split fairly, and keep it transparent."
        actions={
          <button
            onClick={() => setIsCreating(true)}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Add Expense
          </button>
        }
      />
      {activeGroup && isHousehold ? (
        <>
          <ExpenseList
            groupId={activeGroup.id}
            groupName={activeGroup.name}
            currency={activeGroup.default_currency}
            isCreating={isCreating}
            onCancel={() => setIsCreating(false)}
          />
          <RecurringExpensePanel
            groupId={activeGroup.id}
            groupName={activeGroup.name}
            currency={activeGroup.default_currency}
            showCreateForm={false}
          />
        </>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Select a household group to track expenses.</p>
        </section>
      )}
    </div>
  );
}
