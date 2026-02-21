-- Trigger tasks_after_update_recurring: gebruik lowercase status ('open', 'done') na 20250228000000
CREATE OR REPLACE FUNCTION public.tasks_after_update_recurring()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_due date;
  debt_rec record;
  inv_rec record;
BEGIN
  IF OLD.status = NEW.status OR NEW.status <> 'done' THEN
    RETURN NEW;
  END IF;

  next_due := (COALESCE(OLD.due_date, CURRENT_DATE) + interval '1 month')::date;

  IF NEW.source_entity_type = 'debt' AND NEW.source_entity_id IS NOT NULL THEN
    SELECT name, monthly_payment INTO debt_rec FROM public.debts WHERE id = NEW.source_entity_id;
    IF FOUND THEN
      INSERT INTO public.tasks (user_id, title, status, due_date, source_entity_type, source_entity_id)
      VALUES (
        NEW.user_id,
        'Betaal €' || TRIM(TO_CHAR(debt_rec.monthly_payment, '999990.00')) || ' aan ' || debt_rec.name,
        'open',
        next_due,
        'debt',
        NEW.source_entity_id
      );
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.source_entity_type = 'investment' AND NEW.source_entity_id IS NOT NULL THEN
    SELECT name INTO inv_rec FROM public.investments WHERE id = NEW.source_entity_id;
    IF FOUND THEN
      INSERT INTO public.tasks (user_id, title, status, due_date, source_entity_type, source_entity_id)
      VALUES (
        NEW.user_id,
        'Update belegging: ' || inv_rec.name,
        'open',
        next_due,
        'investment',
        NEW.source_entity_id
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
