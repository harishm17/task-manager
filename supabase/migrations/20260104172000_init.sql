-- DivvyDo initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users profile table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Groups
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('personal', 'household')),
  default_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Group people (claimed + unclaimed participants)
CREATE TABLE IF NOT EXISTS public.group_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_group_people_user
  ON public.group_people(group_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_group_people_email
  ON public.group_people(group_id, lower(email))
  WHERE email IS NOT NULL AND is_archived = FALSE;

CREATE TABLE IF NOT EXISTS public.people_merge_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  source_person_id UUID REFERENCES public.group_people(id) ON DELETE SET NULL,
  target_person_id UUID REFERENCES public.group_people(id) ON DELETE SET NULL,
  merged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  moved_counts JSONB NOT NULL,
  merged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to_person_id UUID REFERENCES public.group_people(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_group ON public.tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to_person_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;

-- Recurring task templates
CREATE TABLE IF NOT EXISTS public.recurring_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  interval INTEGER DEFAULT 1,
  assigned_to_person_id UUID REFERENCES public.group_people(id) ON DELETE SET NULL,
  next_occurrence DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  color VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.expense_categories (name, icon, color, is_default)
VALUES
  ('Rent', NULL, '#A855F7', true),
  ('Utilities', NULL, '#3B82F6', true),
  ('Internet', NULL, '#06B6D4', true),
  ('Groceries', NULL, '#10B981', true),
  ('Household', NULL, '#F97316', true),
  ('Food/Dining', NULL, '#EF4444', true),
  ('Transport', NULL, '#6366F1', true),
  ('Entertainment', NULL, '#EC4899', true),
  ('Other', NULL, '#6B7280', true)
ON CONFLICT DO NOTHING;

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  paid_by_person_id UUID NOT NULL REFERENCES public.group_people(id) ON DELETE RESTRICT,
  expense_date DATE NOT NULL,
  split_method VARCHAR(50) NOT NULL DEFAULT 'equal' CHECK (split_method IN ('equal', 'exact', 'percentage', 'shares', 'adjustment')),
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_group ON public.expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by_person ON public.expenses(paid_by_person_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);

-- Expense splits
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.group_people(id) ON DELETE CASCADE,
  amount_owed_cents INTEGER NOT NULL CHECK (amount_owed_cents >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expense_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_splits_expense ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_splits_person ON public.expense_splits(person_id);

-- Settlements
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  from_person_id UUID REFERENCES public.group_people(id) ON DELETE RESTRICT,
  to_person_id UUID REFERENCES public.group_people(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(50),
  notes TEXT,
  settled_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  CHECK(from_person_id != to_person_id)
);

CREATE INDEX IF NOT EXISTS idx_settlements_group ON public.settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_from ON public.settlements(from_person_id);
CREATE INDEX IF NOT EXISTS idx_settlements_to ON public.settlements(to_person_id);

-- Invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  email VARCHAR(255),
  invited_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_merge_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Users: only self
CREATE POLICY "Users can view their profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Groups
CREATE POLICY "Users can view their groups"
  ON public.groups FOR SELECT
  USING (public.is_group_member(id));

CREATE POLICY "Users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update groups"
  ON public.groups FOR UPDATE
  USING (public.is_group_admin(id));

CREATE POLICY "Admins can delete groups"
  ON public.groups FOR DELETE
  USING (public.is_group_admin(id));

-- Group members
CREATE POLICY "Users can view group members"
  ON public.group_members FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "Admins can add group members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can leave groups"
  ON public.group_members FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can update group member roles"
  ON public.group_members FOR UPDATE
  USING (public.is_group_admin(group_id))
  WITH CHECK (public.is_group_admin(group_id));

-- Group people
CREATE POLICY "Users can view group people"
  ON public.group_people FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "Users can create group people in household groups"
  ON public.group_people FOR INSERT
  WITH CHECK (
    public.is_group_member(group_id)
    AND EXISTS (
      SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.type = 'household'
    )
  );

CREATE POLICY "Users can create their personal group person"
  ON public.group_people FOR INSERT
  WITH CHECK (
    public.is_group_member(group_id)
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.type = 'personal'
    )
  );

-- Merge audit
CREATE POLICY "Admins can view merge audit"
  ON public.people_merge_audit FOR SELECT
  USING (public.is_group_admin(group_id));

-- Tasks
CREATE POLICY "Users can view tasks in their groups"
  ON public.tasks FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "Users can create tasks in their groups"
  ON public.tasks FOR INSERT
  WITH CHECK (
    public.is_group_member(group_id)
    AND (
      assigned_to_person_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.group_people gp
        WHERE gp.id = assigned_to_person_id AND gp.group_id = group_id
      )
    )
  );

CREATE POLICY "Users can update tasks in their groups"
  ON public.tasks FOR UPDATE
  USING (public.is_group_member(group_id))
  WITH CHECK (
    public.is_group_member(group_id)
    AND (
      assigned_to_person_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.group_people gp
        WHERE gp.id = assigned_to_person_id AND gp.group_id = group_id
      )
    )
  );

CREATE POLICY "Users can delete tasks they created (or admin)"
  ON public.tasks FOR DELETE
  USING (created_by = auth.uid() OR public.is_group_admin(group_id));

-- Recurring tasks
CREATE POLICY "Users can view recurring tasks in their groups"
  ON public.recurring_tasks FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "Users can create recurring tasks in their groups"
  ON public.recurring_tasks FOR INSERT
  WITH CHECK (public.is_group_member(group_id));

CREATE POLICY "Users can update recurring tasks in their groups"
  ON public.recurring_tasks FOR UPDATE
  USING (public.is_group_member(group_id))
  WITH CHECK (public.is_group_member(group_id));

CREATE POLICY "Users can delete recurring tasks they created (or admin)"
  ON public.recurring_tasks FOR DELETE
  USING (created_by = auth.uid() OR public.is_group_admin(group_id));

-- Expense categories (read-only)
CREATE POLICY "Users can view expense categories"
  ON public.expense_categories FOR SELECT
  USING (true);

-- Expenses
CREATE POLICY "Users can view expenses in their groups"
  ON public.expenses FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "Users can create expenses in their groups"
  ON public.expenses FOR INSERT
  WITH CHECK (
    public.is_group_member(group_id)
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.type = 'household')
    AND EXISTS (SELECT 1 FROM public.group_people gp WHERE gp.id = paid_by_person_id AND gp.group_id = group_id)
  );

CREATE POLICY "Users can update expenses in their groups"
  ON public.expenses FOR UPDATE
  USING (
    public.is_group_member(group_id)
    AND (is_deleted = false OR created_by = auth.uid() OR public.is_group_admin(group_id))
  )
  WITH CHECK (
    public.is_group_member(group_id)
    AND EXISTS (SELECT 1 FROM public.group_people gp WHERE gp.id = paid_by_person_id AND gp.group_id = group_id)
    AND (is_deleted = false OR created_by = auth.uid() OR public.is_group_admin(group_id))
  );

-- Expense splits
CREATE POLICY "Users can view splits for their group expenses"
  ON public.expense_splits FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM public.expenses e WHERE public.is_group_member(e.group_id)
    )
  );

CREATE POLICY "Users can create splits for their group expenses"
  ON public.expense_splits FOR INSERT
  WITH CHECK (
    expense_id IN (
      SELECT id FROM public.expenses e WHERE public.is_group_member(e.group_id)
    )
    AND EXISTS (
      SELECT 1
      FROM public.expenses e
      JOIN public.group_people gp ON gp.id = person_id
      WHERE e.id = expense_id AND gp.group_id = e.group_id
    )
  );

CREATE POLICY "Users can delete splits for their group expenses"
  ON public.expense_splits FOR DELETE
  USING (
    expense_id IN (
      SELECT id FROM public.expenses e WHERE public.is_group_member(e.group_id)
    )
  );

-- Settlements
CREATE POLICY "Users can view settlements in their groups"
  ON public.settlements FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "Users can create settlements in their groups"
  ON public.settlements FOR INSERT
  WITH CHECK (
    public.is_group_member(group_id)
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.type = 'household')
    AND from_person_id = (
      SELECT gp.id
      FROM public.group_people gp
      WHERE gp.group_id = group_id AND gp.user_id = auth.uid()
      LIMIT 1
    )
    AND EXISTS (SELECT 1 FROM public.group_people gp WHERE gp.id = to_person_id AND gp.group_id = group_id)
  );

-- Invitations
CREATE POLICY "Users can view invitations (group members)"
  ON public.invitations FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "Admins can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (public.is_group_admin(group_id) AND invited_by = auth.uid());
