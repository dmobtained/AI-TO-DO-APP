CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON public.notes (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.notes (user_id, pinned) WHERE pinned = true;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select_own_or_admin" ON public.notes;
CREATE POLICY "notes_select_own_or_admin"
  ON public.notes FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "notes_insert_own" ON public.notes;
CREATE POLICY "notes_insert_own"
  ON public.notes FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notes_update_own_or_admin" ON public.notes;
CREATE POLICY "notes_update_own_or_admin"
  ON public.notes FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "notes_delete_own_or_admin" ON public.notes;
CREATE POLICY "notes_delete_own_or_admin"
  ON public.notes FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin_user());

COMMENT ON TABLE public.notes IS 'User notes; module notities.';
