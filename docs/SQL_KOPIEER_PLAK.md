# SQL kopiëren en plakken in Supabase

Ga naar **Supabase Dashboard → SQL Editor**. Voer daarna **per stap** uit:

1. Open het bestand hieronder in je editor (Cursor/VS Code).
2. **Ctrl+A** (alles selecteren) → **Ctrl+C** (kopiëren).
3. Plak in het SQL Editor-veld in Supabase (**Ctrl+V**).
4. Klik **Run** (of Ctrl+Enter).
5. Ga door naar de volgende stap.

---

## Stap 1  
**Bestand:** `supabase/migrations/20250215000000_profiles.sql`

---

## Stap 2  
**Bestand:** `supabase/migrations/20250216000000_schema_updates.sql`  
*Als je de fout "relation modules does not exist" krijgt: voer eerst stap 9 uit, daarna stap 2 opnieuw.*

---

## Stap 3  
**Bestand:** `supabase/migrations/20250218000000_profiles_full_name.sql`

---

## Stap 4  
**Bestand:** `supabase/migrations/20250219000000_activity_log.sql`

---

## Stap 5  
**Bestand:** `supabase/migrations/20250219100000_activity_log_fix_and_trigger.sql`

---

## Stap 6  
**Bestand:** `supabase/migrations/20250219200000_normalize_roles.sql`

---

## Stap 7  
**Bestand:** `supabase/migrations/20250220000000_module_locks.sql`

---

## Stap 8  
**Bestand:** `supabase/migrations/20250220000001_notes.sql`

---

## Stap 9  
**Bestand:** `supabase/migrations/20250221000000_missing_tables.sql`

---

## Stap 10  
**Bestand:** `supabase/migrations/20250222000000_auto_odometer_kenteken.sql`

---

## Stap 11  
**Bestand:** `supabase/migrations/20250223000000_profiles_rls_no_recursion.sql`

---

## Stap 12  
**Bestand:** `supabase/migrations/20250224000000_activity_logs_view.sql`

---

## Stap 13  
**Bestand:** `supabase/migrations/20250225000000_debts_investments.sql`

---

## Stap 14  
**Bestand:** `supabase/migrations/20250225000001_server_functions_and_triggers.sql`

---

## Stap 15  
**Bestand:** `supabase/migrations/20250225000002_auto_entries_liters.sql`

---

## Stap 16  
**Bestand:** `supabase/migrations/20250226000000_agenda_events.sql`

---

## Stap 17  
**Bestand:** `supabase/migrations/20250226100000_agenda_events_end_date.sql`

---

## Stap 18  
**Bestand:** `supabase/migrations/20250227000000_debts_current_balance.sql`

---

## Stap 19  
**Bestand:** `supabase/migrations/20250228000000_tasks_status_lowercase_rls.sql`

---

## Stap 20  
**Bestand:** `supabase/migrations/20250228000001_tasks_trigger_lowercase.sql`

---

## Stap 21  
**Bestand:** `supabase/migrations/20250228000002_debts_investments_trigger_lowercase.sql`

---

## Stap 22  
**Bestand:** `supabase/migrations/20250301000000_tasks_status_uppercase_external_id.sql`  
*(Status OPEN/DONE + kolom external_id; nodig voor de huidige app.)*

---

**Klaar.** Controleer in Table Editor of de tabellen bestaan (o.a. `tasks`, `profiles`, `finance_entries`, `agenda_events`, `debts`).
