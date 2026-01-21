import { supabase } from '../supabaseClient';

export type MergeAuditEntry = {
  id: string;
  merged_at: string;
  moved_counts: Record<string, number>;
  source?: { display_name: string } | null;
  target?: { display_name: string } | null;
};

export async function mergePeople(params: {
  groupId: string;
  sourcePersonId: string;
  targetPersonId: string;
}): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { groupId, sourcePersonId, targetPersonId } = params;
  const { error } = await supabase.functions.invoke('merge-people', {
    body: { groupId, sourcePersonId, targetPersonId },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchMergeAudit(groupId: string): Promise<MergeAuditEntry[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('people_merge_audit')
    .select(
      `id, merged_at, moved_counts,
       source:group_people!people_merge_audit_source_person_id(display_name),
       target:group_people!people_merge_audit_target_person_id(display_name)`
    )
    .eq('group_id', groupId)
    .order('merged_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as MergeAuditEntry[];
}
