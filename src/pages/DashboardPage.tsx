import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../contexts/GroupContext';
import { fetchTasks } from '../lib/api/tasks';
import { fetchExpenses } from '../lib/api/expenses';
import { fetchSettlements } from '../lib/api/settlements';
import { fetchGroupPeople } from '../lib/api/groupPeople';
import { computeNetBalances, fetchBalanceInputs } from '../lib/api/balances';
import { hasSupabaseEnv } from '../lib/supabaseClient';

export function DashboardPage() {
  const { activeGroup } = useGroups();
  const { user } = useAuth();
  const groupLabel = activeGroup ? activeGroup.name : 'No group selected';
  const groupId = activeGroup?.id;
  const isHousehold = activeGroup?.type === 'household';

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', groupId],
    queryFn: () => fetchTasks(groupId ?? ''),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: () => fetchExpenses(groupId ?? ''),
    enabled: Boolean(groupId && hasSupabaseEnv && isHousehold),
  });

  const { data: settlements = [] } = useQuery({
    queryKey: ['settlements', groupId],
    queryFn: () => fetchSettlements(groupId ?? ''),
    enabled: Boolean(groupId && hasSupabaseEnv && isHousehold),
  });

  const { data: people = [] } = useQuery({
    queryKey: ['group-people', groupId],
    queryFn: () => fetchGroupPeople(groupId ?? ''),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const { data: balanceInputs } = useQuery({
    queryKey: ['balances', groupId],
    queryFn: () => fetchBalanceInputs(groupId ?? ''),
    enabled: Boolean(groupId && hasSupabaseEnv && isHousehold),
  });

  const today = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }, []);

  const currentPerson = people.find((person) => person.user_id === user?.id) ?? null;

  const taskStats = useMemo(() => {
    const pending = tasks.filter((task) => task.status !== 'completed');
    const dueToday = pending.filter((task) => task.due_date === today);
    const overdue = pending.filter((task) => task.due_date && task.due_date < today);
    const completedThisWeek = tasks.filter((task) => {
      if (!task.completed_at) return false;
      const completedAt = new Date(task.completed_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return completedAt >= weekAgo;
    });
    const assignedToMe = currentPerson
      ? pending.filter((task) => task.assigned_to_person_id === currentPerson.id).length
      : 0;

    return {
      dueToday: dueToday.length,
      overdue: overdue.length,
      completedThisWeek: completedThisWeek.length,
      pending: pending.length,
      assignedToMe,
    };
  }, [tasks, today, currentPerson]);

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status !== 'completed' && task.due_date)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
      .slice(0, 5);
  }, [tasks]);

  const balances = useMemo(() => {
    if (!isHousehold || !balanceInputs) return [];
    return computeNetBalances(people, balanceInputs.expenses, balanceInputs.splits, balanceInputs.settlements);
  }, [balanceInputs, isHousehold, people]);

  const currentNet = balances.find((row) => row.personId === currentPerson?.id)?.netCents ?? 0;

  const activity = useMemo(() => {
    const taskActivity = tasks.map((task) => {
      const date = task.completed_at ?? task.created_at;
      return {
        id: `task-${task.id}`,
        date,
        label: task.status === 'completed' ? `Completed task: ${task.title}` : `Task: ${task.title}`,
        meta: task.status.replace('_', ' '),
      };
    });
    if (!isHousehold) {
      return taskActivity.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    }
    const expenseActivity = expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      date: expense.expense_date,
      label: expense.description,
      meta: `${(expense.amount_cents / 100).toFixed(2)} ${expense.currency}`,
    }));
    const settlementActivity = settlements.map((settlement) => ({
      id: `settlement-${settlement.id}`,
      date: settlement.settled_at.slice(0, 10),
      label: `${settlement.from_person?.display_name ?? 'Someone'} paid ${
        settlement.to_person?.display_name ?? 'someone'
      }`,
      meta: `${(settlement.amount_cents / 100).toFixed(2)} ${settlement.currency}`,
    }));
    return [...taskActivity, ...expenseActivity, ...settlementActivity]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [expenses, settlements, tasks, isHousehold]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Active group: ${groupLabel}`}
        actions={
          <Link
            to="/tasks"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Add task
          </Link>
        }
      />
      {!hasSupabaseEnv ? (
        <p className="text-sm text-amber-600">Set Supabase env vars to load dashboard data.</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Tasks due today', value: taskStats.dueToday },
          { label: 'Overdue tasks', value: taskStats.overdue },
          { label: 'Assigned to you', value: taskStats.assignedToMe },
          { label: 'Completed (7 days)', value: taskStats.completedThisWeek },
          { label: 'Pending tasks', value: taskStats.pending },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {tasksLoading ? '...' : card.value}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Upcoming tasks</h2>
          {tasksLoading ? <p className="mt-2 text-sm text-slate-500">Loading tasks...</p> : null}
          {!tasksLoading && upcomingTasks.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No upcoming tasks with due dates.</p>
          ) : null}
          {upcomingTasks.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {upcomingTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between">
                  <span className="text-slate-700">{task.title}</span>
                  <span className="text-xs text-slate-400">{task.due_date}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No activity yet. Add a task or expense.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {activity.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span className="text-slate-700">{item.label}</span>
                  <span className="text-xs text-slate-400">{item.meta}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        {isHousehold ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-800">Your balance</h2>
            {currentPerson ? (
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {currentNet >= 0
                  ? `You are owed ${(currentNet / 100).toFixed(2)}`
                  : `You owe ${(Math.abs(currentNet) / 100).toFixed(2)}`}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Add yourself to this household to see your balance.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
