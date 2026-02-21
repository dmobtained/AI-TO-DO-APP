# Migraties en backup

## Tabellen met user data (Supabase)

Exporteer deze tabellen als CSV vóór je migraties draait (Supabase Dashboard → Table Editor → per tabel → Export as CSV):

- `profiles`
- `tasks`
- `finance_entries`
- `recurring_expenses`
- `debts`
- `investments`
- `notes`
- `ai_notes`
- `agenda_events`
- `emails`
- `settings`
- `activity_log`
- `auto_entries`
- `leads`
- `meeting_notes`

Optioneel (config): `modules`, `module_locks`.

## Backup vóór migraties

- [ ] **Backup gedaan (datum: ______________)**  
  Export per tabel als CSV via Supabase Table Editor. Bewaar de bestanden lokaal of in backup storage.

## Eenmalig script: Prisma Tasks → public.tasks

Na het draaien van de migratie `20250301000000_tasks_status_uppercase_external_id.sql`:

- Als je bestaande Prisma Task-rijen met `userId` hebt die in de UI getoond moeten worden, draai éénmalig:
  ```bash
  npx tsx scripts/migrate-prisma-tasks-to-supabase.ts
  ```
  (of `npx ts-node scripts/migrate-prisma-tasks-to-supabase.ts` als ts-node beschikbaar is)

- Vereisten: `DATABASE_URL` (Prisma) en `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` in `.env` / `.env.local`.

## Smoke tests (handmatig)

Na implementatie van de Sonny-core taken-refactor:

1. **Drie users A/B/C:** Elk minstens 1 taak met status OPEN.
2. **Dagnotitie per user:** Ingelogd als A → "Genereer Dagnotitie" → controleer (log of network) dat alleen OPEN-taken van user A in de payload zitten; response bevat alleen eigen context. Herhaal voor B en C.
3. **Verwijderen:** Verwijder een test-taak → verdwijnt alleen voor die user. Verwijder een user (of test RLS) → cascade/geen data van andere user zichtbaar.
