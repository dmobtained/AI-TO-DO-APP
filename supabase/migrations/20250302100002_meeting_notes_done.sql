-- Add done flag for "afvinken" on meeting_notes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_notes')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meeting_notes' AND column_name = 'done') THEN
    ALTER TABLE public.meeting_notes ADD COLUMN done boolean NOT NULL DEFAULT false;
  END IF;
END $$;
