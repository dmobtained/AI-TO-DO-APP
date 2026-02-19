# Supabase instellen – checklist

Voer de stappen in deze volgorde uit (bijv. in **Supabase Dashboard → SQL Editor** of via `npx supabase db push`).

---

## 1. Migraties uitvoeren (in volgorde)

Voer het SQL van elk bestand uit, van oud naar nieuw:

| # | Bestand | Wat het doet |
|---|---------|--------------|
| 1 | `supabase/migrations/20250215000000_profiles.sql` | Tabel **profiles** (id, role, full_name) + RLS |
| 2 | `supabase/migrations/20250216000000_schema_updates.sql` | **modules** (kolommen), **recurring_expenses**, **activity_log**, profiles.role, seed modules |
| 3 | `supabase/migrations/20250218000000_profiles_full_name.sql` | Kolom **full_name** op profiles |
| 4 | `supabase/migrations/20250219000000_activity_log.sql` | **activity_log** (schema), functie **is_admin_user()** |
| 5 | `supabase/migrations/20250219100000_activity_log_fix_and_trigger.sql` | activity_log (actor_user_id, metadata), RLS, **handle_new_user()**, trigger **on_auth_user_created** op auth.users |
| 6 | `supabase/migrations/20250219200000_normalize_roles.sql` | Rol lowercase (admin/user), is_admin_user + handle_new_user aangepast |
| 7 | `supabase/migrations/20250220000000_module_locks.sql` | Tabel **module_locks** + RLS + seed notities |
| 8 | `supabase/migrations/20250220000001_notes.sql` | Tabel **notes** + RLS (notities-module) |
| 9 | `supabase/migrations/20250221000000_missing_tables.sql` | **profiles** (bsn, iban, length_cm, weight_kg), **tasks**, **finance_entries** (incl. category), **emails**, **settings**, **modules** (aanvullend), **ai_notes**, **auto_entries**, **leads**, **meeting_notes** + RLS |
| 10 | `supabase/migrations/20250222000000_auto_odometer_kenteken.sql` | **auto_entries**: kolom `odometer_km` toevoegen indien ontbreekt. **profiles**: kolom `kenteken` (nummerplaat) |

**Let op:** Als je de fout "Could not find the 'odometer_km' column of 'auto_entries'" ziet bij Auto, voer dan migratie 10 uit (of opnieuw migratie 9 als de tabel zonder die kolom was aangemaakt).

**Let op:** Als je lokaal met Supabase CLI werkt: `npx supabase db push` voert alle migraties in één keer uit. Gebruik anders de SQL Editor en plak per bestand de inhoud.

---

## 2. Controleren (na de migraties)

- **Authentication → Users:** Nieuwe gebruikers krijgen automatisch een rij in **profiles** (trigger `on_auth_user_created`).
- **Table Editor:** Controleer of deze tabellen bestaan:  
  `profiles`, `tasks`, `finance_entries`, `emails`, `settings`, `modules`, `activity_log`, `recurring_expenses`, `notes`, `module_locks`, `ai_notes`, `auto_entries`, `leads`, `meeting_notes`.
- **modules:** Minimaal rijen voor o.a. dashboard, taken, financien, email, instellingen (wordt door migratie 2 en 9 geseed).
- **module_locks:** Minimaal één rij met `slug = 'notities'` en `locked = false` (migratie 7).

---

## 3. Environment (.env / .env.local)

Zet in je project (niet in Supabase):

```
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw-anon-key
```

Deze vind je in Supabase onder **Project Settings → API**. Zonder deze variabelen werkt login en alle app-data niet.

Optioneel (voor AI/dagnotitie):

```
N8N_AI_HUB_WEBHOOK=https://...
```
of
```
NEXT_PUBLIC_N8N_AI_HUB_WEBHOOK=https://...
```

---

## 4. Kort overzicht: wat waar voor wat

| Onderdeel in de app | Supabase-tabel / -functie |
|---------------------|----------------------------|
| Login, rol, welkom-naam | **profiles** ( + trigger voor nieuwe users) |
| Taken, beslissingslogboek | **tasks** |
| Financiën (bank, secties, snelle uitgave) | **finance_entries** (incl. **category** voor secties) |
| E-mail inbox | **emails** + evt. **settings** |
| Notities | **notes** + **module_locks** (slug notities) |
| Dagnotitie (AI) | **ai_notes** + webhook in .env |
| Auto (tank, onderhoud, reparatie, aanschaf) | **auto_entries** |
| Business pipeline | **leads** |
| Vergaderingen | **meeting_notes** |
| Persoonlijke info (BSN, IBAN, lengte, gewicht) | **profiles** (kolommen bsn, iban, length_cm, weight_kg) |
| Admin (activity, users) | **activity_log**, **profiles** |
| Feature modules / locks | **modules**, **module_locks** |

---

Als je alle migraties hebt gedraaid en de env-variabelen hebt gezet, zou alles wat er nu in de app zit moeten werken.
