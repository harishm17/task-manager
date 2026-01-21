-- Backfill profile rows for existing auth users
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT id, email, NOW(), NOW()
FROM auth.users
ON CONFLICT (id) DO NOTHING;
