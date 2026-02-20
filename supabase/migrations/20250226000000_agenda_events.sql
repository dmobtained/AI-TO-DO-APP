-- Agenda-events: eigen activiteiten met datum en kleur (naast taken met deadline).

CREATE TABLE IF NOT EXISTS public.agenda_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_date date NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_events_user_id ON public.agenda_events(user_id);
CREATE INDEX IF NOT EXISTS idx_agenda_events_event_date ON public.agenda_events(user_id, event_date);

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_events_own" ON public.agenda_events;
CREATE POLICY "agenda_events_own"
  ON public.agenda_events FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.agenda_events IS 'Agenda-activiteiten met datum en kleur; alleen eigen rijen.';
