-- Sonny-core: public.tasks single source of truth
-- 1) Status normaliseren naar OPEN/DONE (uppercase)
-- 2) external_id voor idempotente imports (n8n/API)
-- 3) Triggers aanpassen naar OPEN/DONE

-- ========== 1. Status OPEN/DONE ==========
UPDATE public.tasks SET status = upper(trim(status)) WHERE status IS NOT NULL;
-- Map legacy lowercase if any
UPDATE public.tasks SET status = 'OPEN' WHERE status NOT IN ('OPEN', 'DONE');
UPDATE public.tasks SET status = 'DONE' WHERE lower(status) = 'done';

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('OPEN', 'DONE'));
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'OPEN';

-- ========== 2. external_id voor idempotentie ==========
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_external_id
  ON public.tasks(user_id, external_id) WHERE external_id IS NOT NULL;

-- ========== 3. Trigger: tasks_after_update_recurring (OPEN/DONE) ==========
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
  IF OLD.status = NEW.status OR NEW.status <> 'DONE' THEN
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
        'OPEN',
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
        'OPEN',
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

-- ========== 4. Triggers debts/investments insert (OPEN) ==========
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
    'OPEN',
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
    'OPEN',
    next_month,
    'investment',
    NEW.id
  );
  RETURN NEW;
END;
$$;
