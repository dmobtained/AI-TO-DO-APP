-- Schema updates for Command Center: modules, recurring_expenses, activity_log
-- Run this in Supabase SQL Editor if your tables don't have these columns yet.

-- 1) Ensure public.modules has is_active and position (add if you use status/order_index)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'modules' AND column_name = 'is_active') THEN
    ALTER TABLE public.modules ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'modules' AND column_name = 'position') THEN
    ALTER TABLE public.modules ADD COLUMN position int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'modules' AND column_name = 'developer_mode') THEN
    ALTER TABLE public.modules ADD COLUMN developer_mode boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Backfill is_active/position from status/order_index if those columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'modules' AND column_name = 'status') THEN
    UPDATE public.modules SET is_active = (status = 'live') WHERE status IN ('live','dev');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'modules' AND column_name = 'order_index') THEN
    UPDATE public.modules SET position = order_index WHERE position = 0 AND order_index IS NOT NULL;
  END IF;
END $$;

-- 2) recurring_expenses
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount decimal(12,2) NOT NULL,
  day_of_month smallint NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON public.recurring_expenses(user_id);
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recurring_expenses"
  ON public.recurring_expenses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3) activity_log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activity_log"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity_log"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4) Ensure finance_entries exists (common structure)
-- CREATE TABLE IF NOT EXISTS public.finance_entries (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   type text NOT NULL CHECK (type IN ('income','expense')),
--   title text NOT NULL,
--   amount decimal(12,2) NOT NULL,
--   entry_date date NOT NULL,
--   created_at timestamptz NOT NULL DEFAULT now()
-- );
-- RLS and policies for finance_entries if not already present

-- 5) Ensure profiles has role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role text NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN','USER'));
  END IF;
END $$;

-- 6) Seed default modules if table is empty (names: dashboard, taken, financien, email, instellingen)
INSERT INTO public.modules (name, is_active, position, developer_mode)
SELECT 'dashboard', true, 0, false WHERE NOT EXISTS (SELECT 1 FROM public.modules WHERE name = 'dashboard');
INSERT INTO public.modules (name, is_active, position, developer_mode)
SELECT 'taken', true, 1, false WHERE NOT EXISTS (SELECT 1 FROM public.modules WHERE name = 'taken');
INSERT INTO public.modules (name, is_active, position, developer_mode)
SELECT 'financien', true, 2, false WHERE NOT EXISTS (SELECT 1 FROM public.modules WHERE name = 'financien');
INSERT INTO public.modules (name, is_active, position, developer_mode)
SELECT 'email', true, 3, false WHERE NOT EXISTS (SELECT 1 FROM public.modules WHERE name = 'email');
INSERT INTO public.modules (name, is_active, position, developer_mode)
SELECT 'instellingen', true, 4, false WHERE NOT EXISTS (SELECT 1 FROM public.modules WHERE name = 'instellingen');
