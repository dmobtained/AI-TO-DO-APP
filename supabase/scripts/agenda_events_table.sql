-- ============================================================
-- Agenda-events tabel + einddatum (voor agenda + werkrooster)
-- Plak dit in Supabase → SQL Editor → Run
-- ============================================================

-- 1) Tabel: activiteiten met begindatum, einddatum (optioneel), kleur
CREATE TABLE IF NOT EXISTS public.agenda_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_date date NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Einddatum-kolom (voor vakantie/meerdere dagen + werkrooster)
ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS event_date_end date;

-- Bestaande rijen: einddatum = begindatum
UPDATE public.agenda_events
  SET event_date_end = event_date
  WHERE event_date_end IS NULL;

-- 3) Indexen
CREATE INDEX IF NOT EXISTS idx_agenda_events_user_id ON public.agenda_events(user_id);
CREATE INDEX IF NOT EXISTS idx_agenda_events_event_date ON public.agenda_events(user_id, event_date);

-- 4) RLS: gebruikers zien alleen eigen rijen
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_events_own" ON public.agenda_events;
CREATE POLICY "agenda_events_own"
  ON public.agenda_events FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5) Commentaar
COMMENT ON TABLE public.agenda_events IS 'Agenda-activiteiten en werkrooster; begindatum + optionele einddatum + kleur.';
COMMENT ON COLUMN public.agenda_events.event_date IS 'Begindatum.';
COMMENT ON COLUMN public.agenda_events.event_date_end IS 'Einddatum (optioneel); voor periodes zoals vakantie of werkrooster.';
