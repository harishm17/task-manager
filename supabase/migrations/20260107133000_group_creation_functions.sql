-- Helper functions for creating groups with membership + person rows
CREATE OR REPLACE FUNCTION public.create_personal_group(
  p_display_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS public.groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_group public.groups;
  display_name TEXT;
  safe_email TEXT;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Missing auth session';
  END IF;

  SELECT g.* INTO new_group
  FROM public.groups g
  JOIN public.group_members gm ON gm.group_id = g.id
  WHERE g.type = 'personal' AND gm.user_id = auth.uid()
  LIMIT 1;

  IF FOUND THEN
    RETURN new_group;
  END IF;

  INSERT INTO public.groups (name, type, created_by)
  VALUES ('Personal', 'personal', auth.uid())
  RETURNING * INTO new_group;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (new_group.id, auth.uid(), 'admin');

  safe_email := NULLIF(TRIM(COALESCE(p_email, '')), '');
  display_name := NULLIF(TRIM(COALESCE(p_display_name, '')), '');
  IF display_name IS NULL THEN
    display_name := COALESCE(NULLIF(split_part(safe_email, '@', 1), ''), 'You');
  END IF;

  INSERT INTO public.group_people (group_id, user_id, display_name, email, created_by)
  VALUES (new_group.id, auth.uid(), display_name, safe_email, auth.uid());

  RETURN new_group;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_household_group(
  p_name TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS public.groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_group public.groups;
  display_name TEXT;
  safe_email TEXT;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Missing auth session';
  END IF;

  IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
    RAISE EXCEPTION 'Group name is required';
  END IF;

  INSERT INTO public.groups (name, type, created_by)
  VALUES (TRIM(p_name), 'household', auth.uid())
  RETURNING * INTO new_group;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (new_group.id, auth.uid(), 'admin');

  safe_email := NULLIF(TRIM(COALESCE(p_email, '')), '');
  display_name := NULLIF(TRIM(COALESCE(p_display_name, '')), '');
  IF display_name IS NULL THEN
    display_name := COALESCE(NULLIF(split_part(safe_email, '@', 1), ''), 'You');
  END IF;

  INSERT INTO public.group_people (group_id, user_id, display_name, email, created_by)
  VALUES (new_group.id, auth.uid(), display_name, safe_email, auth.uid());

  RETURN new_group;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_personal_group(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_household_group(TEXT, TEXT, TEXT) TO authenticated;
