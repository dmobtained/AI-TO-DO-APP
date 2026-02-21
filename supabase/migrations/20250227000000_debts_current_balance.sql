-- Add current_balance to debts (remaining amount). total_amount = start/original.
ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS current_balance decimal(12,2);

-- Backfill: existing rows get current_balance = total_amount
UPDATE public.debts
SET current_balance = total_amount
WHERE current_balance IS NULL;

-- Default for new rows
ALTER TABLE public.debts
  ALTER COLUMN current_balance SET DEFAULT NULL;

COMMENT ON COLUMN public.debts.current_balance IS 'Huidig openstaand bedrag. Als NULL, gelijk aan total_amount.';
COMMENT ON COLUMN public.debts.total_amount IS 'Oorspronkelijk / startbedrag.';
