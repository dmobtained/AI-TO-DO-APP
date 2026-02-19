-- Activity log (audit) table
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_user_id ON public.activity_log (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log (action);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- INSERT: user may only insert their own events (actor_user_id = auth.uid())
CREATE POLICY "activity_log_insert_own"
  ON public.activity_log
  FOR INSERT
  WITH CHECK (actor_user_id = auth.uid());

-- Helper: true if current user is admin (profiles.role = 'admin')
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

-- SELECT: user sees own rows, admin sees all
CREATE POLICY "activity_log_select"
  ON public.activity_log
  FOR SELECT
  USING (actor_user_id = auth.uid() OR public.is_admin_user());

COMMENT ON TABLE public.activity_log IS 'Audit log for user actions (notes, expenses, etc.)';
