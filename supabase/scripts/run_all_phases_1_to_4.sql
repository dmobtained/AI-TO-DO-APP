-- =============================================================================
-- ALLES IN ÉÉN SCRIPT – Fase 1 t/m 4 (debts, investments, functies, triggers, liters)
-- Uitvoeren in Supabase SQL Editor. Geen data wordt verwijderd.
-- =============================================================================

-- ========== FASE 1: debts + investments + indexen ==========

CREATE TABLE IF NOT EXISTS public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  total_amount decimal(12,2) NOT NULL,
  interest_rate decimal(5,2),
  monthly_payment decimal(12,2) NOT NULL,
  start_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_created_at ON public.debts(created_at DESC);
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debts_own_or_admin" ON public.debts;
CREATE POLICY "debts_own_or_admin"
  ON public.debts FOR ALL
  USING (user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user());

CREATE TABLE IF NOT EXISTS public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text,
  invested_amount decimal(12,2) NOT NULL,
  current_value decimal(12,2),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_created_at ON public.investments(created_at DESC);
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investments_own_or_admin" ON public.investments;
CREATE POLICY "investments_own_or_admin"
  ON public.investments FOR ALL
  USING (user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user());

COMMENT ON TABLE public.debts IS 'Schulden; recurring task bij insert.';
COMMENT ON TABLE public.investments IS 'Beleggingen; maandelijkse reminder task bij insert.';

-- ========== FASE 2: Serverfuncties ==========

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

-- ========== FASE 3: tasks source_entity + recurring triggers ==========

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_entity_type text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_entity_id uuid;

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

-- ========== FASE 4: liters op auto_entries + calculate_fuel_stats met liters ==========

ALTER TABLE public.auto_entries ADD COLUMN IF NOT EXISTS liters numeric(10,2);

COMMENT ON COLUMN public.auto_entries.liters IS 'Getankte liters (type=fuel).';

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
  total_liters numeric;
  fuel_rows int;
  cost_km numeric;
  avg_km_per_l numeric;
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
    SELECT entry_date, created_at, odometer_km, amount, liters
    FROM auto_entries
    WHERE user_id = p_user_id AND type = 'fuel'
    ORDER BY entry_date, created_at
  ),
  with_lag AS (
    SELECT
      amount,
      liters,
      odometer_km - LAG(odometer_km) OVER (ORDER BY entry_date, created_at) AS delta_km
    FROM fuel_ordered
  )
  SELECT
    COALESCE(SUM(CASE WHEN delta_km > 0 THEN delta_km ELSE 0 END), 0)::bigint,
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(liters), 0)
  INTO total_km, total_amount, total_liters
  FROM with_lag;

  IF total_km IS NULL OR total_km <= 0 THEN
    RETURN jsonb_build_object(
      'total_km', 0,
      'total_liters', total_liters,
      'avg_consumption_km_per_liter', null,
      'cost_per_km', null,
      'fuel_entries_count', fuel_rows
    );
  END IF;

  cost_km := ROUND((total_amount / total_km)::numeric, 4);
  IF total_liters IS NOT NULL AND total_liters > 0 THEN
    avg_km_per_l := ROUND((total_km::numeric / total_liters), 2);
  ELSE
    avg_km_per_l := null;
  END IF;

  RETURN jsonb_build_object(
    'total_km', total_km,
    'total_liters', total_liters,
    'avg_consumption_km_per_liter', avg_km_per_l,
    'cost_per_km', cost_km,
    'fuel_entries_count', fuel_rows
  );
END;
$$;

COMMENT ON FUNCTION public.calculate_fuel_stats(uuid) IS 'Fuel stats: total_km, total_liters, avg km/L, cost_per_km.';

-- =============================================================================
-- Einde script. Controleer of is_admin_user() bestaat (uit eerdere migraties).
-- Zo niet: die moet eerst aangemaakt worden voordat RLS op debts/investments werkt.
-- =============================================================================
