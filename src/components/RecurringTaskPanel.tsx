import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { hasSupabaseEnv } from '../lib/supabaseClient';
import { fetchGroupPeople } from '../lib/api/groupPeople';
import { createTask } from '../lib/api/tasks';
import {
  createRecurringTask,
  fetchRecurringTasks,
  updateRecurringTask,
} from '../lib/api/recurringTasks';
import { getDueOccurrences, getTodayDateString } from '../lib/recurring';

type RecurringTaskPanelProps = {
  groupId: string;
  showCreateForm?: boolean;
};

export function RecurringTaskPanel({ groupId, showCreateForm = true }: RecurringTaskPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [interval, setInterval] = useState('1');
  const [nextOccurrence, setNextOccurrence] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState('');
  const [assignedToPersonId, setAssignedToPersonId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  const { data: people = [] } = useQuery({
    queryKey: ['group-people', groupId],
    queryFn: () => fetchGroupPeople(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const { data: recurringTasks = [], isLoading: recurringLoading } = useQuery({
    queryKey: ['recurring-tasks', groupId],
    queryFn: () => fetchRecurringTasks(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  // Initialize assignedToPersonId with current user (one-time initialization)
  const hasInitializedAssignee = useRef(false);
  useEffect(() => {
    if (!hasInitializedAssignee.current && !assignedToPersonId && people.length > 0 && user?.id) {
      const self = people.find((person) => person.user_id === user.id);
      if (self) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAssignedToPersonId(self.id);
        hasInitializedAssignee.current = true;
      }
    }
  }, [assignedToPersonId, people, user?.id]);

  const peopleById = useMemo(() => {
    const map = new Map<string, string>();
    people.forEach((person) => map.set(person.id, person.display_name));
    return map;
  }, [people]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Missing user session.');
      }
      const trimmed = title.trim();
      if (!trimmed) {
        throw new Error('Title is required.');
      }
      const intervalValue = Number(interval);
      if (!Number.isFinite(intervalValue) || intervalValue < 1) {
        throw new Error('Interval must be at least 1.');
      }
      if (!nextOccurrence) {
        throw new Error('Pick a start date.');
      }
      return createRecurringTask({
        groupId,
        title: trimmed,
        description: description.trim() || undefined,
        frequency,
        interval: Math.floor(intervalValue),
        nextOccurrence,
        endDate: endDate || null,
        assignedToPersonId: assignedToPersonId || null,
        createdBy: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-tasks', groupId] });
      setTitle('');
      setDescription('');
      setInterval('1');
      setNextOccurrence(getTodayDateString());
      setEndDate('');
      setFormError(null);
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error ? mutationError.message : 'Failed to create recurring task.';
      setFormError(message);
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Missing user session.');
      }
      const today = getTodayDateString();
      let created = 0;

      for (const task of recurringTasks) {
        if (!task.is_active) continue;
        const result = getDueOccurrences({
          nextOccurrence: task.next_occurrence,
          endDate: task.end_date,
          frequency: task.frequency,
          interval: task.interval,
          today,
        });

        if (result.occurrences.length === 0) {
          if (!result.isActive) {
            await updateRecurringTask({
              recurringTaskId: task.id,
              updates: {
                next_occurrence: result.nextOccurrence,
                is_active: false,
              },
            });
          }
          continue;
        }

        for (const occurrence of result.occurrences) {
          await createTask({
            groupId,
            title: task.title,
            description: task.description ?? undefined,
            dueDate: occurrence,
            assignedToPersonId: task.assigned_to_person_id ?? undefined,
            priority: task.priority ?? 'medium',
            createdBy: user.id,
          });
          created += 1;
        }

        await updateRecurringTask({
          recurringTaskId: task.id,
          updates: {
            next_occurrence: result.nextOccurrence,
            is_active: result.isActive,
          },
        });
      }

      return created;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-tasks', groupId] });
      setGenerateMessage(count > 0 ? `Generated ${count} task(s).` : 'No tasks were due.');
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error ? mutationError.message : 'Failed to generate tasks.';
      setGenerateMessage(message);
    },
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Recurring tasks</p>
          <p className="text-sm text-slate-600">
            {showCreateForm
              ? 'Create repeating tasks and generate them on demand.'
              : 'Generate due tasks and review templates.'}
          </p>
        </div>
        {showCreateForm ? (
          <form
            className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr]"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError(null);
              createMutation.mutate();
            }}
          >
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Task title"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              required
            />
            <select
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as 'daily' | 'weekly' | 'monthly')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <input
              type="number"
              min="1"
              value={interval}
              onChange={(event) => setInterval(event.target.value)}
              placeholder="Every 1"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <input
              type="date"
              value={nextOccurrence}
              onChange={(event) => setNextOccurrence(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              placeholder="End date (optional)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <select
              value={assignedToPersonId}
              onChange={(event) => setAssignedToPersonId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="">Unassigned</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.display_name}
                </option>
              ))}
            </select>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description"
              className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none lg:col-span-3"
            />
            {formError ? <p className="text-sm text-rose-600 lg:col-span-3">{formError}</p> : null}
            {!hasSupabaseEnv ? (
              <p className="text-xs text-amber-600 lg:col-span-3">
                Set Supabase env vars to enable recurring tasks.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!hasSupabaseEnv || createMutation.isPending}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400 lg:col-span-3"
            >
              {createMutation.isPending ? 'Saving...' : 'Add recurring task'}
            </button>
          </form>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-800">Templates</p>
          <button
            type="button"
            onClick={() => {
              setGenerateMessage(null);
              generateMutation.mutate();
            }}
            disabled={!hasSupabaseEnv || generateMutation.isPending || recurringTasks.length === 0}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {generateMutation.isPending ? 'Generating...' : 'Generate due tasks'}
          </button>
        </div>
        {generateMessage ? <p className="text-xs text-slate-600">{generateMessage}</p> : null}
        {recurringLoading ? <p className="text-sm text-slate-500">Loading recurring tasks...</p> : null}
        {!recurringLoading && recurringTasks.length === 0 ? (
          <p className="text-sm text-slate-500">No recurring tasks yet.</p>
        ) : null}
        {recurringTasks.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {recurringTasks.map((task) => (
              <li key={task.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{task.title}</p>
                    <p className="text-xs text-slate-500">
                      Next: {task.next_occurrence} · {task.frequency} × {task.interval}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {task.assigned_to_person_id
                      ? peopleById.get(task.assigned_to_person_id) ?? 'Unassigned'
                      : 'Unassigned'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
