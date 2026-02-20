-- Fase 2: Serverfuncties (netto vrije ruimte, fuel stats, debt strategy)
-- Fase 3: tasks source_entity kolommen + recurring triggers

-- ========== Fase 2.1 calculate_net_free_amount ==========
CREATE OR REPLACE FUNCTION public.calculate_net_free_amount(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_income numeric;
  v_expense numeric;
  v_recurring numeric;
  v_debts numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_income
  FROM finance_entries WHERE user_id = p_user_id AND type = 'income';

  SELECT COALESCE(SUM(amount), 0) INTO v_expense
  FROM finance_entries WHERE user_id = p_user_id AND type = 'expense';

  SELECT COALESCE(SUM(amount), 0) INTO v_recurring
  FROM recurring_expenses WHERE user_id = p_user_id AND is_active = true;

  SELECT COALESCE(SUM(monthly_payment), 0) INTO v_debts
  FROM debts WHERE user_id = p_user_id;

  RETURN v_income - v_expense - v_recurring - v_debts;
END;
$$;

COMMENT ON FUNCTION public.calculate_net_free_amount(uuid) IS 'Netto vrije ruimte: income - expense - recurring - debt payments.';

-- ========== Fase 2.2 calculate_fuel_stats ==========
-- Gebruikt odometer_km en amount; liters wordt in Fase 4 toegevoegd (optioneel).
CREATE OR REPLACE FUNCTION public.calculate_fuel_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_km bigint;
  total_amount numeric;
  fuel_rows int;
  cost_km numeric;
BEGIN
  SELECT COUNT(*) INTO fuel_rows
  FROM auto_entries
  WHERE user_id = p_user_id AND type = 'fuel';

  IF fuel_rows < 2 THEN
    RETURN jsonb_build_object(
      'total_km', null,
      'total_liters', null,
      'avg_consumption_km_per_liter', null,
      'cost_per_km', null,
      'fuel_entries_count', fuel_rows
    );
  END IF;

  WITH fuel_ordered AS (
    SELECT entry_date, created_at, odometer_km, amount
    FROM auto_entries
    WHERE user_id = p_user_id AND type = 'fuel'
    ORDER BY entry_date, created_at
  ),
  with_lag AS (
    SELECT
      amount,
      odometer_km - LAG(odometer_km) OVER (ORDER BY entry_date, created_at) AS delta_km
    FROM fuel_ordered
  )
  SELECT
    COALESCE(SUM(CASE WHEN delta_km > 0 THEN delta_km ELSE 0 END), 0)::bigint,
    COALESCE(SUM(amount), 0)
  INTO total_km, total_amount
  FROM with_lag;

  IF total_km IS NULL OR total_km <= 0 THEN
    RETURN jsonb_build_object(
      'total_km', 0,
      'total_liters', null,
      'avg_consumption_km_per_liter', null,
      'cost_per_km', null,
      'fuel_entries_count', fuel_rows
    );
  END IF;

  cost_km := ROUND((total_amount / total_km)::numeric, 4);
  RETURN jsonb_build_object(
    'total_km', total_km,
    'total_liters', null,
    'avg_consumption_km_per_liter', null,
    'cost_per_km', cost_km,
    'fuel_entries_count', fuel_rows
  );
END;
$$;

COMMENT ON FUNCTION public.calculate_fuel_stats(uuid) IS 'Fuel stats: total_km, cost_per_km. Liters/consumption after Fase 4.';

-- ========== Fase 2.3 suggest_debt_strategy ==========
CREATE OR REPLACE FUNCTION public.suggest_debt_strategy(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'avalanche', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'total_amount', total_amount,
          'interest_rate', interest_rate,
          'monthly_payment', monthly_payment
        ) ORDER BY interest_rate DESC NULLS LAST
      ), '[]'::jsonb)
      FROM debts WHERE user_id = p_user_id
    ),
    'snowball', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'total_amount', total_amount,
          'interest_rate', interest_rate,
          'monthly_payment', monthly_payment
        ) ORDER BY total_amount ASC
      ), '[]'::jsonb)
      FROM debts WHERE user_id = p_user_id
    )
  );
$$;

COMMENT ON FUNCTION public.suggest_debt_strategy(uuid) IS 'Debt payoff strategies: avalanche (interest DESC), snowball (amount ASC).';

-- ========== Fase 3.1 tasks source_entity kolommen ==========
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_entity_type text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_entity_id uuid;

-- ========== Fase 3.2 Recurring debt task: bij INSERT op debts ==========
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

DROP TRIGGER IF EXISTS debts_after_insert_task ON public.debts;
CREATE TRIGGER debts_after_insert_task
  AFTER INSERT ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.debts_after_insert_task();

-- ========== Fase 3.3 Recurring: bij afvinken task (debt of investment) volgende maand ==========
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

DROP TRIGGER IF EXISTS tasks_after_update_recurring ON public.tasks;
CREATE TRIGGER tasks_after_update_recurring
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_after_update_recurring();

-- ========== Fase 3.4 Investment: bij INSERT op investments maandelijkse reminder task ==========
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

DROP TRIGGER IF EXISTS investments_after_insert_task ON public.investments;
CREATE TRIGGER investments_after_insert_task
  AFTER INSERT ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.investments_after_insert_task();
