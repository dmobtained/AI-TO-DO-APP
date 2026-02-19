-- Ontbrekende tabellen en kolommen voor volledige functionaliteit.
-- Voer uit na bestaande migraties (20250220*). Gebruik IF NOT EXISTS / ADD COLUMN waar mogelijk.
-- profiles bestaat al (20250215000000 of eerdere setup).

-- 1) Kolommen voor persoonlijke info op profiles (toevoegen als ze nog niet bestaan)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bsn') THEN
    ALTER TABLE public.profiles ADD COLUMN bsn text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'iban') THEN
    ALTER TABLE public.profiles ADD COLUMN iban text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'length_cm') THEN
    ALTER TABLE public.profiles ADD COLUMN length_cm text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'weight_kg') THEN
    ALTER TABLE public.profiles ADD COLUMN weight_kg text;
  END IF;
END $$;

-- 2) tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DONE')),
  priority text DEFAULT 'MEDIUM',
  due_date date,
  context text,
  estimated_time int,
  energy_level text,
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (user_id, status);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_own" ON public.tasks;
CREATE POLICY "tasks_own" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) finance_entries (met category voor secties)
CREATE TABLE IF NOT EXISTS public.finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  title text NOT NULL DEFAULT '',
  amount decimal(12,2) NOT NULL,
  entry_date date NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_entries_user_date ON public.finance_entries (user_id, entry_date DESC);
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_entries_own" ON public.finance_entries;
CREATE POLICY "finance_entries_own" ON public.finance_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'finance_entries' AND column_name = 'category') THEN
    ALTER TABLE public.finance_entries ADD COLUMN category text;
  END IF;
END $$;

-- 4) emails
CREATE TABLE IF NOT EXISTS public.emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  sender text DEFAULT '',
  body text DEFAULT '',
  category text,
  requires_action boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emails_user_id ON public.emails (user_id);
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emails_own" ON public.emails;
CREATE POLICY "emails_own" ON public.emails FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5) settings (key-value, optioneel user_id voor per-user)
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings (key);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_read" ON public.settings;
CREATE POLICY "settings_read" ON public.settings FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "settings_write" ON public.settings;
CREATE POLICY "settings_write" ON public.settings FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 6) modules (basis)
CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  position int NOT NULL DEFAULT 0,
  developer_mode boolean NOT NULL DEFAULT false
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modules_select" ON public.modules;
CREATE POLICY "modules_select" ON public.modules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "modules_all_admin" ON public.modules;
CREATE POLICY "modules_all_admin" ON public.modules FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

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

-- 7) ai_notes (dagnotitie)
CREATE TABLE IF NOT EXISTS public.ai_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_notes_user_id ON public.ai_notes (user_id);
ALTER TABLE public.ai_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_notes_own" ON public.ai_notes;
CREATE POLICY "ai_notes_own" ON public.ai_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8) auto_entries (tankbeurten, onderhoud, reparaties, aanschaf)
CREATE TABLE IF NOT EXISTS public.auto_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('fuel', 'maintenance', 'repair', 'purchase')),
  title text NOT NULL DEFAULT '',
  amount decimal(12,2) NOT NULL DEFAULT 0,
  entry_date date NOT NULL,
  notes text,
  odometer_km int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_entries_user_type ON public.auto_entries (user_id, type);
ALTER TABLE public.auto_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auto_entries_own" ON public.auto_entries;
CREATE POLICY "auto_entries_own" ON public.auto_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9) leads (business pipeline: lead, gesprek, deal)
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'gesprek', 'deal')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_user_stage ON public.leads (user_id, stage);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_own" ON public.leads;
CREATE POLICY "leads_own" ON public.leads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10) meeting_notes (vergaderingen)
CREATE TABLE IF NOT EXISTS public.meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_user_id ON public.meeting_notes (user_id);
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_notes_own" ON public.meeting_notes;
CREATE POLICY "meeting_notes_own" ON public.meeting_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.profiles IS 'User profile; role, full_name, bsn, iban, length_cm, weight_kg';
COMMENT ON TABLE public.auto_entries IS 'Auto: tankbeurten, onderhoud, reparaties, aanschaf';
COMMENT ON TABLE public.leads IS 'Business pipeline: lead, gesprek, deal';
COMMENT ON TABLE public.meeting_notes IS 'Vergaderingen: notities en AI-samenvatting';
