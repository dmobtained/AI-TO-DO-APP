-- STAP 3 — Fix activity_log schema + policies + is_admin_user + handle_new_user
-- Run after 20250216000000 and/or 20250219000000. Safe to run multiple times.

-- 1) If activity_log has old schema (user_id), add new columns and migrate
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'user_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'actor_user_id') THEN
    ALTER TABLE public.activity_log ADD COLUMN actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    UPDATE public.activity_log SET actor_user_id = user_id WHERE user_id IS NOT NULL;
    DELETE FROM public.activity_log WHERE actor_user_id IS NULL;
    ALTER TABLE public.activity_log ALTER COLUMN actor_user_id SET NOT NULL;
    ALTER TABLE public.activity_log DROP COLUMN user_id;
  END IF;
END $$;

ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS actor_email text;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS entity_id uuid;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_activity_log_actor_user_id ON public.activity_log (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log (action);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 2) Drop old policies (from 20250216000000 or any other)
DROP POLICY IF EXISTS "Users can read own activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Users can insert own activity_log" ON public.activity_log;

-- 3) is_admin_user() — profiles.role canonical 'admin' (lowercase)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 4) activity_log policies (RLS only, no service role)
DROP POLICY IF EXISTS "activity_log_insert_own" ON public.activity_log;
CREATE POLICY "activity_log_insert_own"
  ON public.activity_log
  FOR INSERT
  WITH CHECK (actor_user_id = auth.uid());

DROP POLICY IF EXISTS "activity_log_select" ON public.activity_log;
CREATE POLICY "activity_log_select"
  ON public.activity_log
  FOR SELECT
  USING (actor_user_id = auth.uid() OR public.is_admin_user());

-- 5) handle_new_user: insert profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    CASE WHEN LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', ''))) = 'admin' THEN 'admin' ELSE 'user' END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
