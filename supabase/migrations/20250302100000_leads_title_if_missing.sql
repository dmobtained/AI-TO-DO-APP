-- Ensure public.leads has title column (fix "Could not find the 'title' column of 'leads' in the schema cache").
-- Safe to run: only adds column if table exists and column is missing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'title') THEN
    ALTER TABLE public.leads ADD COLUMN title text NOT NULL DEFAULT '';
  END IF;
END $$;
