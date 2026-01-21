-- Recurring expense templates
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  paid_by_person_id UUID NOT NULL REFERENCES public.group_people(id) ON DELETE RESTRICT,
  split_method VARCHAR(50) NOT NULL DEFAULT 'equal' CHECK (
    split_method IN ('equal', 'exact', 'percentage', 'shares', 'adjustment')
  ),
  participant_ids UUID[] NOT NULL DEFAULT '{}',
  split_values JSONB,
  adjustment_from_person_id UUID REFERENCES public.group_people(id) ON DELETE RESTRICT,
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  interval INTEGER DEFAULT 1,
  next_occurrence DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_group ON public.recurring_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next ON public.recurring_expenses(next_occurrence);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recurring expenses in their groups"
  ON public.recurring_expenses FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "Users can create recurring expenses in their groups"
  ON public.recurring_expenses FOR INSERT
  WITH CHECK (
    public.is_group_member(group_id)
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.type = 'household')
    AND EXISTS (SELECT 1 FROM public.group_people gp WHERE gp.id = paid_by_person_id AND gp.group_id = group_id)
    AND (
      adjustment_from_person_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.group_people gp
        WHERE gp.id = adjustment_from_person_id AND gp.group_id = group_id
      )
    )
  );

CREATE POLICY "Users can update recurring expenses in their groups"
  ON public.recurring_expenses FOR UPDATE
  USING (public.is_group_member(group_id))
  WITH CHECK (public.is_group_member(group_id));

CREATE POLICY "Users can delete recurring expenses they created (or admin)"
  ON public.recurring_expenses FOR DELETE
  USING (created_by = auth.uid() OR public.is_group_admin(group_id));
