-- Ensure public.meeting_notes has summary column (fix schema cache error).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_notes')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meeting_notes' AND column_name = 'summary') THEN
    ALTER TABLE public.meeting_notes ADD COLUMN summary text;
  END IF;
END $$;
