import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../contexts/GroupContext';
import { useTutorial } from '../components/common/TutorialTooltip';
import { fetchTasks } from '../lib/api/tasks';
import { fetchExpenses } from '../lib/api/expenses';
import { fetchSettlements } from '../lib/api/settlements';
import { fetchGroupPeople } from '../lib/api/groupPeople';
import { computeNetBalances, fetchBalanceInputs } from '../lib/api/balances';
import { hasSupabaseEnv } from '../lib/supabaseClient';

export function DashboardPage() {
  const { activeGroup } = useGroups();
  const { user } = useAuth();
  const { startTutorial } = useTutorial();
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

  // Personalized greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const userName = user?.email?.split('@')[0] || 'there';

    if (hour < 12) return { message: `Good morning, ${userName}! ☀️`, timeOfDay: 'morning' };
    if (hour < 17) return { message: `Good afternoon, ${userName}! 🌤️`, timeOfDay: 'afternoon' };
    return { message: `Good evening, ${userName}! 🌙`, timeOfDay: 'evening' };
  }, [user?.email]);

  // Spending analytics for this month
  const spendingAnalytics = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const monthlyExpenses = expenses.filter(expense =>
      expense.expense_date.startsWith(thisMonth)
    );

    const totalSpent = monthlyExpenses.reduce((sum, exp) => sum + exp.amount_cents, 0) / 100;
    const budget = 1500; // Default budget, could be configurable later
    const remaining = budget - totalSpent;
    const percentage = Math.min((totalSpent / budget) * 100, 100);

    // Category breakdown
    const categoryBreakdown = monthlyExpenses.reduce((acc, expense) => {
      const categoryName = expense.category?.name || 'Other';
      acc[categoryName] = (acc[categoryName] || 0) + expense.amount_cents;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(categoryBreakdown).map(([name, amount]) => ({
      name,
      value: amount / 100,
      percentage: Math.round((amount / (totalSpent * 100)) * 100),
    }));

    // Colors for the pie chart
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

    return {
      totalSpent,
      budget,
      remaining,
      percentage,
      chartData: chartData.map((item, index) => ({
        ...item,
        fill: colors[index % colors.length],
      })),
    };
  }, [expenses]);

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
      {/* Personalized Greeting */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border border-blue-100" data-tutorial="dashboard-title">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {greeting.message}
            </h1>
            <p className="text-slate-600">
              You have {taskStats.dueToday} tasks due today and ${Math.abs(currentNet / 100).toFixed(2)} {currentNet >= 0 ? 'owed to you' : 'you owe'}.
            </p>
          </div>
          <button
            onClick={() => startTutorial('dashboard-intro')}
            className="px-3 py-1.5 text-sm bg-white/80 hover:bg-white border border-blue-200 rounded-lg text-blue-700 hover:text-blue-800 transition-colors"
          >
            Take Tour
          </button>
        </div>
      </div>

      {!hasSupabaseEnv ? (
        <p className="text-sm text-amber-600">Set Supabase env vars to load dashboard data.</p>
      ) : null}

      {/* Key Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tutorial="dashboard-metrics">
        <Link
          to="/tasks"
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">📝 Tasks</p>
            <span className="text-slate-400 group-hover:text-slate-600 transition-colors">→</span>
          </div>
          <p className="text-2xl font-semibold text-slate-900">
            {tasksLoading ? '...' : taskStats.dueToday}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            due today • {taskStats.overdue} overdue
          </p>
        </Link>

        <Link
          to="/expenses"
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">💰 Expenses</p>
            <span className="text-slate-400 group-hover:text-slate-600 transition-colors">→</span>
          </div>
          <p className="text-2xl font-semibold text-slate-900">
            ${spendingAnalytics.totalSpent.toFixed(0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            this month • ↑12% vs last
          </p>
        </Link>

        <Link
          to="/balances"
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">💸 Balance</p>
            <span className="text-slate-400 group-hover:text-slate-600 transition-colors">→</span>
          </div>
          <p className="text-2xl font-semibold text-slate-900">
            ${Math.abs(currentNet / 100).toFixed(0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {currentNet >= 0 ? 'owed to you' : 'you owe'}
          </p>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">✅ Completed</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">
            {tasksLoading ? '...' : taskStats.completedThisWeek}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            last 7 days
          </p>
        </div>
      </div>
      {/* Spending Overview & Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's Priorities */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-tutorial="dashboard-priorities">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">🎯 Today's Priorities</h2>
          {tasksLoading ? (
            <p className="text-sm text-slate-500">Loading tasks...</p>
          ) : upcomingTasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm text-slate-500">All caught up!</p>
              <Link
                to="/tasks"
                className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block"
              >
                Add a new task →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      Due {task.due_date} • {task.priority} priority
                    </p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {task.due_date === today ? 'Today' : task.due_date}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Spending This Month */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-tutorial="dashboard-spending">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">📊 Spending This Month</h2>
            <Link
              to="/expenses"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View report →
            </Link>
          </div>

          <div className="space-y-4">
            {/* Summary */}
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-slate-900">
                  ${spendingAnalytics.totalSpent.toFixed(0)}
                </span>
                <span className="text-sm text-slate-500">
                  of ${spendingAnalytics.budget}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${spendingAnalytics.percentage}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                ${spendingAnalytics.remaining.toFixed(0)} remaining
              </p>
            </div>

            {/* Category Breakdown */}
            {spendingAnalytics.chartData.length > 0 && (
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spendingAnalytics.chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {spendingAnalytics.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | undefined) => value ? [`$${value.toFixed(2)}`, 'Amount'] : ['$0.00', 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Categories */}
            <div className="space-y-2">
              {spendingAnalytics.chartData.slice(0, 3).map((category) => (
                <div key={category.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.fill }}
                    />
                    <span className="text-slate-700">{category.name}</span>
                  </div>
                  <div className="text-slate-500">
                    ${category.value.toFixed(0)} ({category.percentage}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">🔔 Recent Activity</h2>
            <Link
              to="/settings"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all →
            </Link>
          </div>

          {activity.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm text-slate-500">No activity yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Add a task or expense to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">
                    {item.label.includes('task') ? '📝' :
                     item.label.includes('expense') ? '💰' :
                     item.label.includes('settlement') ? '💸' : '📅'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 truncate">
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.date}
                    </p>
                  </div>
                  {item.meta && (
                    <div className="text-xs text-slate-400 font-medium">
                      {item.meta}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
