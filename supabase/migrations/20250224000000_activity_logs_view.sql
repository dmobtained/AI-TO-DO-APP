-- Sommige code of triggers verwachten de tabel "activity_logs" (meervoud).
-- De echte tabel heet "activity_log". View + trigger zodat beide namen werken.

-- Kolommen table_name, row_id, payload toevoegen indien iets die verwacht (bijv. Supabase Realtime of triggers)
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS table_name text;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS row_id uuid;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;

CREATE OR REPLACE VIEW public.activity_logs AS
SELECT id, created_at, actor_user_id, actor_email, action, entity_type, entity_id, metadata, table_name, row_id, payload
FROM public.activity_log;

-- INSERT doorsturen naar activity_log (voor o.a. API/triggers die naar activity_logs schrijven)
CREATE OR REPLACE FUNCTION public.activity_logs_insert_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_log (actor_user_id, actor_email, action, entity_type, entity_id, metadata, table_name, row_id, payload)
  VALUES (
    COALESCE(NEW.actor_user_id, auth.uid()),
    NEW.actor_email,
    COALESCE(NEW.action, ''),
    NEW.entity_type,
    NEW.entity_id,
    COALESCE(NEW.metadata, '{}'::jsonb),
    NEW.table_name,
    NEW.row_id,
    COALESCE(NEW.payload, '{}'::jsonb)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activity_logs_insert_trigger ON public.activity_logs;
CREATE TRIGGER activity_logs_insert_trigger
  INSTEAD OF INSERT ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.activity_logs_insert_fn();

COMMENT ON VIEW public.activity_logs IS 'Alias voor activity_log zodat relation "activity_logs" exists.';
