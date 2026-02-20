-- Fase 1: debts + investments + indexen. RLS: user_id = auth.uid() OR is_admin_user().

-- 1) debts
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

-- 2) investments
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
