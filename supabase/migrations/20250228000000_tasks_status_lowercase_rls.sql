-- FASE 1: Normaliseer tasks.status naar lowercase (open/done)
UPDATE public.tasks SET status = lower(status) WHERE status IS NOT NULL;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('open', 'done'));
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'open';

-- FASE 2: RLS verharden — aparte policies voor SELECT, INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "tasks_own" ON public.tasks;

CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "tasks_insert"
  ON public.tasks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "tasks_delete"
  ON public.tasks FOR DELETE
  USING (user_id = auth.uid());
