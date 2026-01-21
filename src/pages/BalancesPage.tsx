import { BalancesPanel } from '../components/BalancesPanel';
import { PageHeader } from '../components/PageHeader';
import { useGroups } from '../contexts/GroupContext';

export function BalancesPage() {
  const { activeGroup } = useGroups();
  const isHousehold = activeGroup?.type === 'household';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Balances"
        subtitle="See who owes what and settle up fast."
        actions={
          <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Settle Up
          </button>
        }
      />
      {activeGroup && isHousehold ? (
        <BalancesPanel groupId={activeGroup.id} groupName={activeGroup.name} currency={activeGroup.default_currency} />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Select a household group to view balances.</p>
        </section>
      )}
    </div>
  );
}
