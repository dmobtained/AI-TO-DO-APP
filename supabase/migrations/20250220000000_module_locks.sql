-- module_locks: admin-only write; authenticated read.
CREATE TABLE IF NOT EXISTS public.module_locks (
  slug text PRIMARY KEY,
  locked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_module_locks_locked ON public.module_locks (locked) WHERE locked = true;

ALTER TABLE public.module_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "module_locks_select_authenticated" ON public.module_locks;
CREATE POLICY "module_locks_select_authenticated"
  ON public.module_locks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "module_locks_all_admin" ON public.module_locks;
CREATE POLICY "module_locks_all_admin"
  ON public.module_locks FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

INSERT INTO public.module_locks (slug, locked) VALUES ('notities', false) ON CONFLICT (slug) DO NOTHING;
