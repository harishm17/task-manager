import { supabase } from '../supabaseClient';

export type Task = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to_person_id: string | null;
  created_by: string;
  due_date: string | null;
  completed_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskWithAssignee = Task & {
  assigned_person?: { id: string; display_name: string } | null;
};

export async function fetchTasks(groupId: string): Promise<Task[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(
      'id, group_id, title, description, status, priority, assigned_to_person_id, created_by, due_date, completed_at, is_deleted, deleted_at, deleted_by, created_at, updated_at'
    )
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as TaskWithAssignee[];
}

export async function fetchTasksWithAssignee(groupId: string): Promise<TaskWithAssignee[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(
      `id, group_id, title, description, status, priority, assigned_to_person_id, created_by, due_date, completed_at, is_deleted, deleted_at, deleted_by, created_at, updated_at,
       assigned_person:group_people!tasks_assigned_to_person_id(id, display_name)`
    )
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as TaskWithAssignee[];
}

export async function createTask(params: {
  groupId: string;
  title: string;
  description?: string;
  priority?: Task['priority'];
  dueDate?: string;
  assignedToPersonId?: string | null;
  createdBy: string;
}): Promise<Task> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const {
    groupId,
    title,
    description,
    priority = 'medium',
    dueDate,
    assignedToPersonId,
    createdBy,
  } = params;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      group_id: groupId,
      title,
      description: description || null,
      priority,
      due_date: dueDate || null,
      assigned_to_person_id: assignedToPersonId ?? null,
      created_by: createdBy,
    })
    .select(
      'id, group_id, title, description, status, priority, assigned_to_person_id, created_by, due_date, completed_at, is_deleted, deleted_at, deleted_by, created_at, updated_at'
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create task.');
  }

  return data;
}

export async function updateTask(params: {
  taskId: string;
  updates: Partial<Pick<Task, 'status' | 'title' | 'description' | 'priority' | 'due_date' | 'assigned_to_person_id'>>;
}): Promise<Task> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { taskId, updates } = params;

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select(
      'id, group_id, title, description, status, priority, assigned_to_person_id, created_by, due_date, completed_at, is_deleted, deleted_at, deleted_by, created_at, updated_at'
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update task.');
  }

  return data;
}

export async function deleteTask(taskId: string, deletedBy: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
    })
    .eq('id', taskId);
  if (error) {
    throw new Error(error.message);
  }
}
