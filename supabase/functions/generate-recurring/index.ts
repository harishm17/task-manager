import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RecurringTask {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  assigned_to_person_id: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  next_occurrence: string;
  end_date: string | null;
  is_active: boolean;
  created_by: string;
}

interface RecurringExpense {
  id: string;
  group_id: string;
  description: string;
  amount_cents: number;
  currency: string;
  category_id: string | null;
  paid_by_person_id: string;
  split_method: string;
  participant_ids: string[];
  split_values: Record<string, number> | null;
  adjustment_from_person_id: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  next_occurrence: string;
  end_date: string | null;
  is_active: boolean;
  created_by: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`Starting recurring generation for date: ${today}`);

    // Generate recurring tasks
    const { data: recurringTasks, error: tasksError } = await supabase
      .from('recurring_tasks')
      .select('*')
      .eq('is_active', true)
      .lte('next_occurrence', today);

    if (tasksError) {
      console.error('Error fetching recurring tasks:', tasksError);
    } else {
      console.log(`Found ${recurringTasks?.length || 0} recurring tasks to process`);

      for (const recurringTask of recurringTasks || []) {
        try {
          await generateTaskFromRecurring(supabase, recurringTask, today);
        } catch (error) {
          console.error(`Failed to generate task from recurring ${recurringTask.id}:`, error);
        }
      }
    }

    // Generate recurring expenses
    const { data: recurringExpenses, error: expensesError } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('is_active', true)
      .lte('next_occurrence', today);

    if (expensesError) {
      console.error('Error fetching recurring expenses:', expensesError);
    } else {
      console.log(`Found ${recurringExpenses?.length || 0} recurring expenses to process`);

      for (const recurringExpense of recurringExpenses || []) {
        try {
          await generateExpenseFromRecurring(supabase, recurringExpense, today);
        } catch (error) {
          console.error(`Failed to generate expense from recurring ${recurringExpense.id}:`, error);
        }
      }
    }

    console.log('Recurring generation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Recurring items generated successfully',
        tasksGenerated: recurringTasks?.length || 0,
        expensesGenerated: recurringExpenses?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in generate-recurring function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function generateTaskFromRecurring(
  supabase: SupabaseClient,
  recurringTask: RecurringTask,
  today: string
) {
  // Check for duplicate: see if we already created a task today from this recurring task
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('group_id', recurringTask.group_id)
    .eq('title', recurringTask.title)
    .eq('due_date', today)
    .limit(1);

  if (existingTasks && existingTasks.length > 0) {
    console.log(`Task already exists for recurring task ${recurringTask.id} on ${today}, skipping`);
    return;
  }

  // Calculate next occurrence
  const nextOccurrence = calculateNextOccurrence(
    recurringTask.frequency,
    recurringTask.interval,
    recurringTask.next_occurrence
  );

  // Check if we've reached the end date
  if (recurringTask.end_date && nextOccurrence > recurringTask.end_date) {
    // Deactivate the recurring task
    await supabase
      .from('recurring_tasks')
      .update({ is_active: false })
      .eq('id', recurringTask.id);

    console.log(`Deactivated recurring task ${recurringTask.id} - reached end date`);
    return;
  }

  // Create the new task
  const { data: newTask, error: createError } = await supabase
    .from('tasks')
    .insert({
      group_id: recurringTask.group_id,
      title: recurringTask.title,
      description: recurringTask.description,
      status: 'todo',
      priority: recurringTask.priority,
      assigned_to_person_id: recurringTask.assigned_to_person_id,
      created_by: recurringTask.created_by,
      due_date: today, // Today's date as due date
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create task: ${createError.message}`);
  }

  // Update the recurring task's next occurrence
  const { error: updateError } = await supabase
    .from('recurring_tasks')
    .update({ next_occurrence: nextOccurrence })
    .eq('id', recurringTask.id);

  if (updateError) {
    console.error(`Failed to update next occurrence for task ${recurringTask.id}:`, updateError);
  }

  // Create notification for the group members
  await createRecurringNotification(
    supabase,
    recurringTask.group_id,
    `Recurring task generated: ${recurringTask.title}`,
    `A new "${recurringTask.title}" task has been created from your recurring schedule.`,
    'recurring_generated'
  );

  console.log(`Generated task "${newTask.title}" from recurring task ${recurringTask.id}`);
}

async function generateExpenseFromRecurring(
  supabase: SupabaseClient,
  recurringExpense: RecurringExpense,
  today: string
) {
  // Check for duplicate: see if we already created an expense today from this recurring expense
  const { data: existingExpenses } = await supabase
    .from('expenses')
    .select('id')
    .eq('group_id', recurringExpense.group_id)
    .eq('description', recurringExpense.description)
    .eq('expense_date', today)
    .limit(1);

  if (existingExpenses && existingExpenses.length > 0) {
    console.log(`Expense already exists for recurring expense ${recurringExpense.id} on ${today}, skipping`);
    return;
  }

  // Calculate next occurrence
  const nextOccurrence = calculateNextOccurrence(
    recurringExpense.frequency,
    recurringExpense.interval,
    recurringExpense.next_occurrence
  );

  // Check if we've reached the end date
  if (recurringExpense.end_date && nextOccurrence > recurringExpense.end_date) {
    // Deactivate the recurring expense
    await supabase
      .from('recurring_expenses')
      .update({ is_active: false })
      .eq('id', recurringExpense.id);

    console.log(`Deactivated recurring expense ${recurringExpense.id} - reached end date`);
    return;
  }

  // Create the expense splits based on the split method
  const expenseSplits = calculateExpenseSplits(
    recurringExpense.split_method,
    recurringExpense.amount_cents,
    recurringExpense.participant_ids,
    recurringExpense.split_values
  );

  // Create the expense
  const { data: newExpense, error: createError } = await supabase
    .from('expenses')
    .insert({
      group_id: recurringExpense.group_id,
      description: recurringExpense.description,
      amount_cents: recurringExpense.amount_cents,
      currency: recurringExpense.currency,
      category_id: recurringExpense.category_id,
      paid_by_person_id: recurringExpense.paid_by_person_id,
      expense_date: today,
      split_method: recurringExpense.split_method,
      created_by: recurringExpense.created_by,
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create expense: ${createError.message}`);
  }

  // Create the expense splits
  if (expenseSplits.length > 0) {
    const { error: splitsError } = await supabase
      .from('expense_splits')
      .insert(
        expenseSplits.map(split => ({
          expense_id: newExpense.id,
          ...split,
        }))
      );

    if (splitsError) {
      console.error(`Failed to create expense splits for expense ${newExpense.id}:`, splitsError);
    }
  }

  // Update the recurring expense's next occurrence
  const { error: updateError } = await supabase
    .from('recurring_expenses')
    .update({ next_occurrence: nextOccurrence })
    .eq('id', recurringExpense.id);

  if (updateError) {
    console.error(`Failed to update next occurrence for expense ${recurringExpense.id}:`, updateError);
  }

  // Create notification for the group members
  await createRecurringNotification(
    supabase,
    recurringExpense.group_id,
    `Recurring expense generated: ${recurringExpense.description}`,
    `A new "${recurringExpense.description}" expense has been created from your recurring schedule.`,
    'recurring_generated'
  );

  console.log(`Generated expense "${newExpense.description}" from recurring expense ${recurringExpense.id}`);
}

/**
 * Calculate expense splits based on split method
 */
function calculateExpenseSplits(
  splitMethod: string,
  amountCents: number,
  participantIds: string[],
  splitValues: Record<string, number> | null
): Array<{ person_id: string; amount_owed_cents: number }> {
  const splits: Array<{ person_id: string; amount_owed_cents: number }> = [];

  switch (splitMethod) {
    case 'equal': {
      // Equal split with largest remainder method
      const amountPerPerson = Math.floor(amountCents / participantIds.length);
      let remainder = amountCents - (amountPerPerson * participantIds.length);

      for (const personId of participantIds) {
        let amount = amountPerPerson;
        if (remainder > 0) {
          amount += 1;
          remainder -= 1;
        }
        splits.push({ person_id: personId, amount_owed_cents: amount });
      }
      break;
    }

    case 'exact': {
      // Exact amounts specified for each person
      if (splitValues) {
        for (const [personId, amount] of Object.entries(splitValues)) {
          splits.push({ person_id: personId, amount_owed_cents: Math.round(amount) });
        }
      }
      break;
    }

    case 'percentage': {
      // Percentage-based split
      if (splitValues) {
        const amounts: Array<{ personId: string; ideal: number; actual: number; remainder: number }> = [];
        let totalAssigned = 0;

        // Calculate ideal amounts and remainders
        for (const [personId, percentage] of Object.entries(splitValues)) {
          const idealAmount = (amountCents * percentage) / 100;
          const actualAmount = Math.floor(idealAmount);
          const remainder = idealAmount - actualAmount;
          amounts.push({ personId, ideal: idealAmount, actual: actualAmount, remainder });
          totalAssigned += actualAmount;
        }

        // Distribute remainder using largest remainder method
        const shortfall = amountCents - totalAssigned;
        amounts.sort((a, b) => b.remainder - a.remainder);

        for (let i = 0; i < shortfall; i++) {
          amounts[i].actual += 1;
        }

        // Create splits
        for (const { personId, actual } of amounts) {
          splits.push({ person_id: personId, amount_owed_cents: actual });
        }
      }
      break;
    }

    case 'shares': {
      // Share-based split (weighted distribution)
      if (splitValues) {
        const totalShares = Object.values(splitValues).reduce((sum, shares) => sum + shares, 0);
        const amounts: Array<{ personId: string; ideal: number; actual: number; remainder: number }> = [];
        let totalAssigned = 0;

        // Calculate ideal amounts and remainders
        for (const [personId, shares] of Object.entries(splitValues)) {
          const idealAmount = (amountCents * shares) / totalShares;
          const actualAmount = Math.floor(idealAmount);
          const remainder = idealAmount - actualAmount;
          amounts.push({ personId, ideal: idealAmount, actual: actualAmount, remainder });
          totalAssigned += actualAmount;
        }

        // Distribute remainder using largest remainder method
        const shortfall = amountCents - totalAssigned;
        amounts.sort((a, b) => b.remainder - a.remainder);

        for (let i = 0; i < shortfall; i++) {
          amounts[i].actual += 1;
        }

        // Create splits
        for (const { personId, actual } of amounts) {
          splits.push({ person_id: personId, amount_owed_cents: actual });
        }
      }
      break;
    }

    case 'adjustment': {
      // Equal split with adjustments
      if (splitValues) {
        const baseAmount = Math.floor(amountCents / participantIds.length);
        let remainder = amountCents - (baseAmount * participantIds.length);

        const amounts: Array<{ personId: string; amount: number }> = [];
        let totalAdjustment = 0;

        // Calculate adjusted amounts
        for (const personId of participantIds) {
          const adjustment = splitValues[personId] || 0;
          totalAdjustment += adjustment;
          let amount = baseAmount + adjustment;
          if (remainder > 0) {
            amount += 1;
            remainder -= 1;
          }
          amounts.push({ personId, amount });
        }

        // Ensure total matches (adjustments should sum to 0, but handle edge cases)
        const total = amounts.reduce((sum, a) => sum + a.amount, 0);
        if (total !== amountCents) {
          // Adjust the first person's amount to match total
          amounts[0].amount += (amountCents - total);
        }

        // Create splits
        for (const { personId, amount } of amounts) {
          splits.push({ person_id: personId, amount_owed_cents: amount });
        }
      }
      break;
    }

    default:
      console.error(`Unknown split method: ${splitMethod}`);
      break;
  }

  return splits;
}

function calculateNextOccurrence(
  frequency: 'daily' | 'weekly' | 'monthly',
  interval: number,
  currentOccurrence: string
): string {
  const date = new Date(currentOccurrence);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + interval);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (interval * 7));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + interval);
      break;
  }

  return date.toISOString().split('T')[0];
}

async function createRecurringNotification(
  supabase: SupabaseClient,
  groupId: string,
  title: string,
  message: string,
  type: string
) {
  // createdBy removed - not currently used in notification creation
  // Get group name for the notification
  const { data: group } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single();

  const groupName = group?.name || 'Group';

  // Create notification for all group members
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  if (members) {
    // In a real implementation, you'd create notifications in a notifications table
    // For now, we'll just log that notifications would be created
    console.log(`Would create ${type} notifications for ${members.length} group members:`, {
      title,
      message,
      groupName,
      groupId,
    });
  }
}
