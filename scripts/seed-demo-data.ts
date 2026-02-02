/**
 * Demo Data Seeding Script
 *
 * Creates realistic demo data for showcasing DivvyDo features:
 * - Multiple users (roommates)
 * - Household group
 * - Expenses with all split methods
 * - Tasks with various statuses
 * - Balances and settlements
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing environment variables. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Demo users
const DEMO_USERS = [
  { email: 'alice@demo.divvydo.app', name: 'Alice Chen', password: 'demo123456' },
  { email: 'bob@demo.divvydo.app', name: 'Bob Martinez', password: 'demo123456' },
  { email: 'charlie@demo.divvydo.app', name: 'Charlie Kim', password: 'demo123456' },
  { email: 'dana@demo.divvydo.app', name: 'Dana Foster', password: 'demo123456' },
];

async function seedDemoData() {
  console.log('🌱 Seeding demo data...\n');

  // Step 1: Create demo users
  console.log('👥 Creating demo users...');
  const userIds: Record<string, string> = {};

  for (const user of DEMO_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        name: user.name,
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log(`   ⚠️  User ${user.email} already exists, fetching ID...`);
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (existingUser) {
          userIds[user.name] = existingUser.id;
        }
      } else {
        console.error(`   ❌ Error creating ${user.email}:`, error.message);
        continue;
      }
    } else if (data.user) {
      userIds[user.name] = data.user.id;
      console.log(`   ✓ Created ${user.name} (${user.email})`);
    }
  }

  if (Object.keys(userIds).length < 4) {
    console.error('❌ Failed to create all demo users');
    process.exit(1);
  }

  // Step 2: Create household group
  console.log('\n🏠 Creating household group...');
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: 'Downtown Apartment',
      created_by: userIds['Alice Chen'],
    })
    .select()
    .single();

  if (groupError || !group) {
    console.error('❌ Error creating group:', groupError);
    process.exit(1);
  }

  console.log(`   ✓ Created group: ${group.name}`);

  // Step 3: Add members to group
  console.log('\n👨‍👩‍👧‍👦 Adding members to group...');
  const members = [
    { user_id: userIds['Alice Chen'], role: 'admin' },
    { user_id: userIds['Bob Martinez'], role: 'member' },
    { user_id: userIds['Charlie Kim'], role: 'member' },
    { user_id: userIds['Dana Foster'], role: 'member' },
  ];

  for (const member of members) {
    const { error } = await supabase.from('group_members').insert({
      group_id: group.id,
      ...member,
    });

    if (error) {
      console.error(`   ❌ Error adding member:`, error);
    } else {
      console.log(`   ✓ Added member (${member.role})`);
    }
  }

  // Step 4: Create people records for the group
  console.log('\n🧑 Creating people records...');
  const peopleIds: Record<string, string> = {};

  for (const [name, userId] of Object.entries(userIds)) {
    const { data: person, error } = await supabase
      .from('people')
      .insert({
        group_id: group.id,
        user_id: userId,
        display_name: name,
        is_placeholder: false,
      })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Error creating person for ${name}:`, error);
    } else {
      peopleIds[name] = person.id;
      console.log(`   ✓ Created person: ${name}`);
    }
  }

  // Step 5: Create expenses with different split methods
  console.log('\n💰 Creating expenses...');
  const expenses = [
    {
      description: 'Rent - November',
      amount_cents: 240000, // $2,400
      paid_by: 'Alice Chen',
      split_method: 'equal',
      participants: ['Alice Chen', 'Bob Martinez', 'Charlie Kim', 'Dana Foster'],
    },
    {
      description: 'Groceries - Costco',
      amount_cents: 15432, // $154.32
      paid_by: 'Bob Martinez',
      split_method: 'equal',
      participants: ['Alice Chen', 'Bob Martinez', 'Charlie Kim', 'Dana Foster'],
    },
    {
      description: 'Electricity Bill',
      amount_cents: 12050, // $120.50
      paid_by: 'Charlie Kim',
      split_method: 'equal',
      participants: ['Alice Chen', 'Bob Martinez', 'Charlie Kim', 'Dana Foster'],
    },
    {
      description: 'Internet & Cable',
      amount_cents: 8999, // $89.99
      paid_by: 'Alice Chen',
      split_method: 'equal',
      participants: ['Alice Chen', 'Bob Martinez', 'Charlie Kim', 'Dana Foster'],
    },
    {
      description: 'Furniture - IKEA',
      amount_cents: 45000, // $450
      paid_by: 'Dana Foster',
      split_method: 'percentage',
      participants: ['Alice Chen', 'Bob Martinez', 'Charlie Kim', 'Dana Foster'],
      split_values: {
        [peopleIds['Alice Chen']]: 40,
        [peopleIds['Bob Martinez']]: 30,
        [peopleIds['Charlie Kim']]: 20,
        [peopleIds['Dana Foster']]: 10,
      },
    },
    {
      description: 'House Cleaning Service',
      amount_cents: 15000, // $150
      paid_by: 'Alice Chen',
      split_method: 'shares',
      participants: ['Alice Chen', 'Bob Martinez', 'Charlie Kim', 'Dana Foster'],
      split_values: {
        [peopleIds['Alice Chen']]: 1,
        [peopleIds['Bob Martinez']]: 1,
        [peopleIds['Charlie Kim']]: 1,
        [peopleIds['Dana Foster']]: 1,
      },
    },
  ];

  for (const expense of expenses) {
    // Create expense
    const { data: newExpense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        group_id: group.id,
        description: expense.description,
        amount_cents: expense.amount_cents,
        currency: 'USD',
        paid_by_person_id: peopleIds[expense.paid_by],
        split_method: expense.split_method,
        expense_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], // Random date within last 30 days
        created_by: userIds[expense.paid_by],
      })
      .select()
      .single();

    if (expenseError || !newExpense) {
      console.error(`   ❌ Error creating expense "${expense.description}":`, expenseError);
      continue;
    }

    // Create expense splits
    const splits = expense.participants.map((participant) => {
      let amountOwed = 0;

      if (expense.split_method === 'equal') {
        const perPerson = Math.floor(expense.amount_cents / expense.participants.length);
        amountOwed = perPerson;
      } else if (expense.split_method === 'percentage' && expense.split_values) {
        const percentage = expense.split_values[peopleIds[participant]];
        amountOwed = Math.floor((expense.amount_cents * percentage) / 100);
      } else if (expense.split_method === 'shares' && expense.split_values) {
        const totalShares = Object.values(expense.split_values).reduce(
          (sum, shares) => sum + shares,
          0
        );
        const shares = expense.split_values[peopleIds[participant]];
        amountOwed = Math.floor((expense.amount_cents * shares) / totalShares);
      }

      return {
        expense_id: newExpense.id,
        person_id: peopleIds[participant],
        amount_owed_cents: amountOwed,
      };
    });

    const { error: splitsError } = await supabase.from('expense_splits').insert(splits);

    if (splitsError) {
      console.error(`   ❌ Error creating splits for "${expense.description}":`, splitsError);
    } else {
      console.log(`   ✓ Created expense: ${expense.description} ($${expense.amount_cents / 100})`);
    }
  }

  // Step 6: Create tasks
  console.log('\n✅ Creating tasks...');
  const tasks = [
    {
      title: 'Take out trash',
      description: 'Trash day is Thursday',
      status: 'todo',
      priority: 'high',
      assigned_to: 'Bob Martinez',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      title: 'Clean kitchen',
      description: null,
      status: 'in_progress',
      priority: 'medium',
      assigned_to: 'Charlie Kim',
      due_date: new Date().toISOString().split('T')[0],
    },
    {
      title: 'Vacuum living room',
      description: null,
      status: 'completed',
      priority: 'low',
      assigned_to: 'Dana Foster',
      due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      title: 'Buy paper towels',
      description: 'Running low',
      status: 'todo',
      priority: 'medium',
      assigned_to: 'Alice Chen',
      due_date: null,
    },
    {
      title: 'Schedule pest control',
      description: 'Annual maintenance',
      status: 'todo',
      priority: 'low',
      assigned_to: null,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  ];

  for (const task of tasks) {
    const { error } = await supabase.from('tasks').insert({
      group_id: group.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigned_to_person_id: task.assigned_to ? peopleIds[task.assigned_to] : null,
      due_date: task.due_date,
      created_by: userIds['Alice Chen'],
    });

    if (error) {
      console.error(`   ❌ Error creating task "${task.title}":`, error);
    } else {
      console.log(`   ✓ Created task: ${task.title} (${task.status})`);
    }
  }

  console.log('\n✨ Demo data seeding complete!');
  console.log('\n📝 Demo Credentials:');
  for (const user of DEMO_USERS) {
    console.log(`   ${user.name}: ${user.email} / ${user.password}`);
  }
}

seedDemoData().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
