-- Add priority to recurring tasks
ALTER TABLE public.recurring_tasks
  ADD COLUMN IF NOT EXISTS priority VARCHAR(50) NOT NULL DEFAULT 'medium'
  CHECK (priority IN ('low', 'medium', 'high'));
