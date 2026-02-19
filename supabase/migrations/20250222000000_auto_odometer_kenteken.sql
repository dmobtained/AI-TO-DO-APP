-- Zorg dat auto_entries.odometer_km bestaat (schema cache / bestaande tabellen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auto_entries' AND column_name = 'odometer_km') THEN
    ALTER TABLE public.auto_entries ADD COLUMN odometer_km int;
  END IF;
END $$;

-- Kenteken (nummerplaat) per gebruiker op profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'kenteken') THEN
    ALTER TABLE public.profiles ADD COLUMN kenteken text;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.kenteken IS 'Kenteken van de auto (nummerplaat)';
