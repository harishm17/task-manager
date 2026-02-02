import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import PullToRefresh from 'react-pull-to-refresh';
import type { Task } from '../lib/api/tasks';
import { createTask, deleteTask, fetchTasks, updateTask } from '../lib/api/tasks';
import { fetchGroupPeople } from '../lib/api/groupPeople';
import { useAuth } from '../contexts/AuthContext';
import { hasSupabaseEnv } from '../lib/supabaseClient';
import { createRecurringTask } from '../lib/api/recurringTasks';
import { TaskItem } from './tasks/TaskItem';
import { TaskForm } from './tasks/TaskForm';
import { TaskFilters } from './tasks/TaskFilters';

type TaskListProps = {
  groupId: string;
  isCreating: boolean;
  onCancel: () => void;
};

// Mutation data types
interface CreateTaskMutationData {
  mode: 'single' | 'recurring';
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignedToPersonId?: string;
  startDate?: string;
  endDate?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: string;
}

export function TaskList({ groupId, isCreating, onCancel }: TaskListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Task['status']>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['priority']>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'unassigned' | string>('all');

  // Edit State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Listen for FAB events
  useEffect(() => {
    const handleFabNewTask = () => {
      onCancel(); // Close any existing forms
      // Small delay to ensure smooth transition
      setTimeout(() => {
        setFormError(null);
        setEditingTaskId(null);
      }, 100);
    };

    window.addEventListener('fab-new-task', handleFabNewTask);
    return () => window.removeEventListener('fab-new-task', handleFabNewTask);
  }, [onCancel]);

  // Group People
  const { data: people = [] } = useQuery({
    queryKey: ['group-people', groupId],
    queryFn: () => fetchGroupPeople(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  const peopleById = useMemo(() => {
    const map = new Map<string, string>();
    people.forEach((person) => map.set(person.id, person.display_name));
    return map;
  }, [people]);

  // Tasks Query
  const {
    data: tasks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['tasks', groupId],
    queryFn: () => fetchTasks(groupId),
    enabled: Boolean(groupId && hasSupabaseEnv),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: CreateTaskMutationData) => {
      if (!user?.id) throw new Error('Missing user session.');
      const { mode, title, description, priority, dueDate, assignedToPersonId, startDate, endDate, frequency, interval } = data;

      if (mode === 'recurring') {
        return createRecurringTask({
          groupId,
          title: title.trim(),
          description: description?.trim() || undefined,
          frequency: frequency || 'weekly',
          interval: Number(interval || 1),
          nextOccurrence: startDate || new Date().toISOString().split('T')[0],
          endDate: endDate || null,
          assignedToPersonId: assignedToPersonId || null,
          createdBy: user.id,
          priority,
        });
      }

      return createTask({
        groupId,
        title: title.trim(),
        description: description?.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        assignedToPersonId: assignedToPersonId || undefined,
        createdBy: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-tasks', groupId] });
      setFormError(null);
      onCancel();
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to create task'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) =>
      updateTask({ taskId, updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
      setEditingTaskId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => {
      if (!user?.id) throw new Error('Missing user session.');
      return deleteTask(taskId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
    },
  });

  // Derived State
  const filteredTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return (tasks ?? []).filter((task) => {
      if (normalizedQuery) {
        const haystack = `${task.title} ${task.description ?? ''}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (assigneeFilter === 'unassigned' && task.assigned_to_person_id) return false;
      if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned' && task.assigned_to_person_id !== assigneeFilter) return false;
      return true;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter]);

  const hasFilters = Boolean(searchQuery.trim()) || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all';

  // Memoized callbacks for performance
  const handleToggleStatus = useCallback((task: Task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    updateMutation.mutate({ taskId: task.id, updates: { status: nextStatus } });
  }, [updateMutation]);

  const handleEdit = useCallback((task: Task) => {
    setEditingTaskId(task.id);
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
  }, [queryClient, groupId]);

  return (
    <section className="space-y-6">
      {/* Creation Form */}
      <AnimatePresence>
        {isCreating && (
          <div className="mb-6">
            <TaskForm
              people={people}
              onSubmit={(data) => createMutation.mutate(data as CreateTaskMutationData)}
              onCancel={onCancel}
              isSubmitting={createMutation.isPending}
              error={formError}
              mode="create"
              initialData={{ assigned_to_person_id: people.find(p => p.user_id === user?.id)?.id }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <TaskFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        assigneeFilter={assigneeFilter}
        setAssigneeFilter={setAssigneeFilter}
        people={people}
        onClear={() => {
          setSearchQuery('');
          setStatusFilter('all');
          setPriorityFilter('all');
          setAssigneeFilter('all');
        }}
        hasFilters={hasFilters}
      />

      {/* Loading & Empty States */}
      {error && <p className="text-sm text-rose-600">{String(error)}</p>}
      {isLoading && <p className="text-sm text-slate-500">Loading tasks...</p>}

      {!isLoading && tasks && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-slate-50 p-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-slate-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-900">No tasks yet</p>
          <p className="text-sm text-slate-500">Get started by creating a new task.</p>
        </div>
      )}

      {!isLoading && tasks && tasks.length > 0 && filteredTasks.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-8">No tasks match your filters.</p>
      )}

      {/* List */}
      <PullToRefresh onRefresh={handleRefresh}>
        <ul className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task) => (
              editingTaskId === task.id ? (
                <li key={task.id} className="mb-4">
                  <TaskForm
                    key={`edit-${task.id}`}
                    mode="edit"
                    people={people}
                    initialData={task}
                    onCancel={() => setEditingTaskId(null)}
                    onSubmit={(data) => {
                      // data contains form fields. Map them to update object.
                      const updates: Partial<Task> = {
                        title: data.title,
                        description: data.description || null,
                        priority: data.priority,
                        due_date: data.due_date || null,
                        assigned_to_person_id: data.assigned_to_person_id || null,
                      };
                      updateMutation.mutate({ taskId: task.id, updates });
                    }}
                    isSubmitting={updateMutation.isPending}
                  />
                </li>
              ) : (
                <TaskItem
                  key={task.id}
                  task={task}
                  assigneeName={peopleById.get(task.assigned_to_person_id ?? '') ?? 'Unassigned'}
                  onToggleStatus={handleToggleStatus}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isUpdating={updateMutation.isPending}
                />
              )
            ))}
          </AnimatePresence>
        </ul>
      </PullToRefresh>
    </section>
  );
}
