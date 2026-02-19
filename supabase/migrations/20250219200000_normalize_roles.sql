-- Canonical role casing: 'admin' | 'user' (lowercase) everywhere.

-- 1) Update existing profile roles to lowercase
UPDATE public.profiles SET role = lower(role) WHERE role IS NOT NULL;

-- 2) Enforce check constraint (lowercase only)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user'));

-- 3) Default 'user'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

-- 4) is_admin_user() — canonical lowercase
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- 5) handle_new_user() — insert lowercase role, default 'user'; no email required (column optional)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r text;
BEGIN
  r := COALESCE(TRIM(LOWER(NEW.raw_user_meta_data->>'role')), '');
  r := CASE WHEN r = 'admin' THEN 'admin' ELSE 'user' END;
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    r,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$;

-- Trigger already exists from 20250219100000; just replace function above
-- RLS activity_log: SELECT uses is_admin_user() (now lowercase); INSERT unchanged.
