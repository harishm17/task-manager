import { supabase } from '../supabaseClient';
import type { RecurringFrequency } from '../recurring';
import type { Task } from './tasks';

export type RecurringTask = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  frequency: RecurringFrequency;
  interval: number;
  priority: Task['priority'];
  assigned_to_person_id: string | null;
  next_occurrence: string;
  end_date: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
};

export async function fetchRecurringTasks(groupId: string): Promise<RecurringTask[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('recurring_tasks')
    .select(
      'id, group_id, title, description, frequency, interval, priority, assigned_to_person_id, next_occurrence, end_date, is_active, created_by, created_at'
    )
    .eq('group_id', groupId)
    .order('next_occurrence', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RecurringTask[];
}

export async function createRecurringTask(params: {
  groupId: string;
  title: string;
  description?: string;
  frequency: RecurringFrequency;
  interval: number;
  nextOccurrence: string;
  endDate?: string | null;
  assignedToPersonId?: string | null;
  priority?: Task['priority'];
  createdBy: string;
}): Promise<RecurringTask> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const {
    groupId,
    title,
    description,
    frequency,
    interval,
    nextOccurrence,
    endDate,
    assignedToPersonId,
    priority,
    createdBy,
  } = params;

  const { data, error } = await supabase
    .from('recurring_tasks')
    .insert({
      group_id: groupId,
      title,
      description: description || null,
      frequency,
      interval,
      priority: priority ?? 'medium',
      assigned_to_person_id: assignedToPersonId ?? null,
      next_occurrence: nextOccurrence,
      end_date: endDate ?? null,
      is_active: true,
      created_by: createdBy,
    })
    .select(
      'id, group_id, title, description, frequency, interval, priority, assigned_to_person_id, next_occurrence, end_date, is_active, created_by, created_at'
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create recurring task.');
  }

  return data as RecurringTask;
}

export async function updateRecurringTask(params: {
  recurringTaskId: string;
  updates: Partial<Pick<RecurringTask, 'next_occurrence' | 'end_date' | 'is_active'>>;
}): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { recurringTaskId, updates } = params;
  const { error } = await supabase.from('recurring_tasks').update(updates).eq('id', recurringTaskId);

  if (error) {
    throw new Error(error.message);
  }
}
