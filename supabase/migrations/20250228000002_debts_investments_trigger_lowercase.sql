-- debts_after_insert_task en investments_after_insert_task: gebruik lowercase 'open' (na 20250228000000)
CREATE OR REPLACE FUNCTION public.debts_after_insert_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_month date;
BEGIN
  next_month := (date_trunc('month', CURRENT_DATE)::date + interval '1 month')::date;
  INSERT INTO public.tasks (user_id, title, status, due_date, source_entity_type, source_entity_id)
  VALUES (
    NEW.user_id,
    'Betaal €' || TRIM(TO_CHAR(NEW.monthly_payment, '999990.00')) || ' aan ' || NEW.name,
    'open',
    next_month,
    'debt',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.investments_after_insert_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_month date;
BEGIN
  next_month := (date_trunc('month', CURRENT_DATE)::date + interval '1 month')::date;
  INSERT INTO public.tasks (user_id, title, status, due_date, source_entity_type, source_entity_id)
  VALUES (
    NEW.user_id,
    'Update belegging: ' || NEW.name,
    'open',
    next_month,
    'investment',
    NEW.id
  );
  RETURN NEW;
END;
$$;
