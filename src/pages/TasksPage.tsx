import { PageHeader } from '../components/PageHeader';
import { RecurringTaskPanel } from '../components/RecurringTaskPanel';
import { TaskList } from '../components/TaskList';
import { useGroups } from '../contexts/GroupContext';
import { useState } from 'react';



export function TasksPage() {
  const { activeGroup } = useGroups();
  const [isCreating, setIsCreating] = useState(false);
  const subtitle = activeGroup
    ? `Showing tasks for ${activeGroup.name}.`
    : 'Select a group to see tasks.';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        subtitle={subtitle}
        actions={
          <button
            onClick={() => setIsCreating(true)}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            New Task
          </button>
        }
      />
      {activeGroup ? (
        <>
          <TaskList
            groupId={activeGroup.id}
            isCreating={isCreating}
            onCancel={() => setIsCreating(false)}
          />
          <RecurringTaskPanel groupId={activeGroup.id} showCreateForm={false} />
        </>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Select a group to manage tasks.</p>
        </section>
      )}
    </div>
  );
}
