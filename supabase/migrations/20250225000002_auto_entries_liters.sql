-- Fase 4: liters op auto_entries voor tankbeurten; calculate_fuel_stats uitbreiden.

ALTER TABLE public.auto_entries ADD COLUMN IF NOT EXISTS liters numeric(10,2);

COMMENT ON COLUMN public.auto_entries.liters IS 'Getankte liters (type=fuel).';

-- calculate_fuel_stats: total_liters en avg_consumption_km_per_liter vullen indien liters beschikbaar
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
