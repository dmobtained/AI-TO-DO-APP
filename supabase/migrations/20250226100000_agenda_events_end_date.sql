-- Begindatum + einddatum voor agenda-events (bijv. vakantie over meerdere dagen).

ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS event_date_end date;

-- Bestaande rijen: einddatum = begindatum (één dag)
UPDATE public.agenda_events
  SET event_date_end = event_date
  WHERE event_date_end IS NULL;

COMMENT ON COLUMN public.agenda_events.event_date IS 'Begindatum van de activiteit.';
COMMENT ON COLUMN public.agenda_events.event_date_end IS 'Einddatum (optioneel). Als gelijk aan of na event_date: activiteit loopt over meerdere dagen.';
