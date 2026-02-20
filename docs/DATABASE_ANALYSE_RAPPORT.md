# Database-analyse en herstelrapport

**Datum:** 20 februari 2025  
**Doel:** Volledige analyse van de Supabase-database (gereconstrueerd uit migraties) en vergelijking met de gewenste eindarchitectuur. Geen SQL, geen data verwijderen, geen oude migraties automatisch draaien.

---

## Let op: bron van “huidige staat”

De **werkelijke** live database is niet direct geïnspecteerd. Onderstaande “huidige staat” is **gereconstrueerd** uit de 12 migratiebestanden, in volgorde 20250215000000 → … → 20250224000000. Als migraties gedeeltelijk, in andere volgorde of nooit zijn gedraaid, wijkt je echte database af. De sectie **Afwijkingen** beschrijft zowel inconsistenties t.o.v. de doelarchitectuur als **mogelijke** afwijkingen in een reële (gedeeltelijk gemigreerde) database.

---

# Deel 1 — Gewenste eindarchitectuur (doel)

Bron: `docs/DATABASE_HERSTELPLAN.md` §1.

## 1.1 Tabellen en vereisten

| Tabel | Doel | Verplichte kolommen / eigenschappen | RLS-kern |
|-------|------|-------------------------------------|----------|
| **profiles** | Gebruikersprofiel | id (PK, ref auth.users), role ('admin'\|'user'), full_name, bsn, iban, length_cm, weight_kg, kenteken | Alleen eigen rij SELECT/UPDATE. **Geen** policy die is_admin_user() aanroept. |
| **tasks** | Taken | id, user_id, title, details, status (OPEN/DONE), priority, due_date, context, estimated_time, energy_level, tags, created_at | auth.uid() = user_id |
| **finance_entries** | Bank / uitgaven | id, user_id, type (income/expense), title, amount, entry_date, category, created_at | auth.uid() = user_id |
| **emails** | Inbox | id, user_id, subject, sender, body, category, requires_action, created_at | auth.uid() = user_id |
| **settings** | Key-value | id, key (unique), value, user_id (optioneel) | eigen user_id of global (user_id IS NULL) |
| **modules** | Feature flags | id, name (unique), is_active, position, developer_mode. Seed: dashboard, taken, financien, email, instellingen | SELECT iedereen; ALL alleen is_admin_user() |
| **activity_log** | Audit | id, created_at, actor_user_id, actor_email, action, entity_type, entity_id, metadata (jsonb). Optioneel: table_name, row_id, payload | INSERT actor_user_id = auth.uid(); SELECT eigen of admin |
| **activity_logs** | Alias | View op activity_log; INSTEAD OF INSERT naar activity_log | Via activity_log |
| **recurring_expenses** | Vaste lasten | id, user_id, title, amount, day_of_month, is_active, created_at | auth.uid() = user_id |
| **notes** | Notities | id, user_id, title, content, pinned, created_at, updated_at | eigen of admin |
| **module_locks** | Lock modules | slug (PK), locked, updated_at. Seed: notities | SELECT authenticated; write admin |
| **ai_notes** | Dagnotitie AI | id, user_id, note, created_at | auth.uid() = user_id |
| **auto_entries** | Auto (tank, onderhoud, etc.) | id, user_id, type (fuel/maintenance/repair/purchase), title, amount, entry_date, notes, odometer_km, created_at | auth.uid() = user_id |
| **leads** | Pipeline | id, user_id, title, stage (lead/gesprek/deal), notes, created_at, updated_at | auth.uid() = user_id |
| **meeting_notes** | Vergaderingen | id, user_id, content, summary, created_at, updated_at | auth.uid() = user_id |

## 1.2 Functies en triggers (doel)

- **is_admin_user()** — SECURITY DEFINER, search_path = public; returnt true als profiles.role = 'admin' voor auth.uid(). **Niet** gebruiken in een policy op **profiles** (recursie).
- **handle_new_user()** — trigger op auth.users AFTER INSERT: insert/update in profiles (id, role, full_name); rol uit raw_user_meta_data of default 'user'.
- **activity_logs_insert_fn()** — INSTEAD OF INSERT op view activity_logs: schrijft door naar activity_log (inclusief table_name, row_id, payload).

---

# Deel 2 — Huidige staat (gereconstrueerd uit migraties)

Na toepassing van alle 12 migraties in volgorde.

## 2.1 profiles

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| id | uuid | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE |
| role | text | NOT NULL, DEFAULT 'user', CHECK (role IN ('admin', 'user')) |
| full_name | text | — |
| bsn | text | — |
| iban | text | — |
| length_cm | text | — |
| weight_kg | text | — |
| kenteken | text | — |

**RLS:** Aan.  
**Policies:**  
- `profiles_select_own`: SELECT USING (auth.uid() = id)  
- `profiles_update_own`: UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)

Geen policy met is_admin_user() op profiles (correct).

---

## 2.2 tasks

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| title | text | NOT NULL |
| details | text | — |
| status | text | NOT NULL, DEFAULT 'OPEN', CHECK (status IN ('OPEN', 'DONE')) |
| priority | text | DEFAULT 'MEDIUM' |
| due_date | date | — |
| context | text | — |
| estimated_time | int | — |
| energy_level | text | — |
| tags | jsonb | DEFAULT '[]'::jsonb |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

**RLS:** Aan.  
**Policies:**  
- `tasks_own`: ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

---

## 2.3 finance_entries

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| type | text | NOT NULL, CHECK (type IN ('income', 'expense')) |
| title | text | NOT NULL DEFAULT '' |
| amount | decimal(12,2) | NOT NULL |
| entry_date | date | NOT NULL |
| category | text | — |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

**RLS:** Aan.  
**Policies:**  
- `finance_entries_own`: ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

---

## 2.4 emails

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| subject | text | NOT NULL DEFAULT '' |
| sender | text | DEFAULT '' |
| body | text | DEFAULT '' |
| category | text | — |
| requires_action | boolean | DEFAULT false |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

**RLS:** Aan.  
**Policies:**  
- `emails_own`: ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

---

## 2.5 settings

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| key | text | NOT NULL UNIQUE |
| value | text | — |
| user_id | uuid | REFERENCES auth.users(id) ON DELETE CASCADE |

**RLS:** Aan.  
**Policies:**  
- `settings_read`: SELECT USING (auth.uid() = user_id OR user_id IS NULL)  
- `settings_write`: ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL)

---

## 2.6 modules

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| name | text | NOT NULL UNIQUE |
| is_active | boolean | NOT NULL DEFAULT true |
| position | int | NOT NULL DEFAULT 0 |
| developer_mode | boolean | NOT NULL DEFAULT false |

**RLS:** Aan.  
**Policies:**  
- `modules_select`: SELECT TO authenticated USING (true)  
- `modules_all_admin`: ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user())

**Seed (verwacht):** dashboard, taken, financien, email, instellingen.

---

## 2.7 activity_log

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| actor_user_id | uuid | NOT NULL (geen FK in migraties) |
| actor_email | text | — |
| action | text | NOT NULL |
| entity_type | text | — |
| entity_id | uuid | — |
| metadata | jsonb | NOT NULL DEFAULT '{}'::jsonb |
| table_name | text | — (optioneel, migratie 12) |
| row_id | uuid | — (optioneel) |
| payload | jsonb | DEFAULT '{}'::jsonb (optioneel) |

**RLS:** Aan.  
**Policies:**  
- `activity_log_insert_own`: INSERT WITH CHECK (actor_user_id = auth.uid())  
- `activity_log_select`: SELECT USING (actor_user_id = auth.uid() OR is_admin_user())

---

## 2.8 activity_logs (view)

**Definitie:** View op activity_log met kolommen id, created_at, actor_user_id, actor_email, action, entity_type, entity_id, metadata, table_name, row_id, payload.

**Trigger:** INSTEAD OF INSERT → `activity_logs_insert_fn()` schrijft naar activity_log.

---

## 2.9 recurring_expenses

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| title | text | NOT NULL |
| amount | decimal(12,2) | NOT NULL |
| day_of_month | smallint | NOT NULL, CHECK (1..31) |
| is_active | boolean | NOT NULL DEFAULT true |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

**RLS:** Aan.  
**Policies:**  
- "Users can manage own recurring_expenses": ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

---

## 2.10 notes

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| title | text | NOT NULL DEFAULT '' |
| content | text | NOT NULL DEFAULT '' |
| pinned | boolean | NOT NULL DEFAULT false |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

**RLS:** Aan.  
**Policies:**  
- `notes_select_own_or_admin`: SELECT USING (user_id = auth.uid() OR is_admin_user())  
- `notes_insert_own`: INSERT WITH CHECK (user_id = auth.uid())  
- `notes_update_own_or_admin`: UPDATE USING (user_id = auth.uid() OR is_admin_user()) WITH CHECK (…)  
- `notes_delete_own_or_admin`: DELETE USING (user_id = auth.uid() OR is_admin_user())

---

## 2.11 module_locks

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| slug | text | PRIMARY KEY |
| locked | boolean | NOT NULL DEFAULT false |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

**RLS:** Aan.  
**Policies:**  
- `module_locks_select_authenticated`: SELECT TO authenticated USING (true)  
- `module_locks_all_admin`: ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user())

**Seed (verwacht):** notities.

---

## 2.12 ai_notes

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| note | text | NOT NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

**RLS:** Aan.  
**Policies:**  
- `ai_notes_own`: ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

---

## 2.13 auto_entries

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| type | text | NOT NULL, CHECK (type IN ('fuel', 'maintenance', 'repair', 'purchase')) |
| title | text | NOT NULL DEFAULT '' |
| amount | decimal(12,2) | NOT NULL DEFAULT 0 |
| entry_date | date | NOT NULL |
| notes | text | — |
| odometer_km | int | — |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

**RLS:** Aan.  
**Policies:**  
- `auto_entries_own`: ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

---

## 2.14 leads

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| title | text | NOT NULL DEFAULT '' |
| stage | text | NOT NULL DEFAULT 'lead', CHECK (stage IN ('lead', 'gesprek', 'deal')) |
| notes | text | — |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

**RLS:** Aan.  
**Policies:**  
- `leads_own`: ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

---

## 2.15 meeting_notes

| Kolom | Datatype | Constraints |
|-------|----------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| content | text | NOT NULL DEFAULT '' |
| summary | text | — |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

**RLS:** Aan.  
**Policies:**  
- `meeting_notes_own`: ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

---

## 2.16 Functies en triggers (gereconstrueerd)

- **is_admin_user()** — aanwezig; SECURITY DEFINER, search_path = public; role = 'admin' (lowercase).
- **handle_new_user()** — aanwezig; INSERT/ON CONFLICT DO UPDATE in profiles; trigger `on_auth_user_created` op auth.users AFTER INSERT.
- **activity_logs_insert_fn()** — aanwezig; INSTEAD OF INSERT op view activity_logs.

---

# Deel 3 — Afwijkingen (vergelijking + mogelijke echte afwijkingen)

## 3.1 Reconstructie vs. doelarchitectuur

De gereconstrueerde staat na alle 12 migraties **komt overeen** met de doelarchitectuur voor:

- Tabellen: alle 15 entiteiten (14 tabellen + 1 view) aanwezig.  
- Kolommen en datatypes: conform doel (length_cm/weight_kg als text is in de app zo bedoeld).  
- RLS: profiles zonder is_admin_user(); activity_log insert own + select own or admin; modules select all + all admin; overige user-tabellen op user_id.  
- Functies/triggers: is_admin_user(), handle_new_user(), activity_logs view + trigger.

**Geen** structurele afwijkingen in de “ideale” eindstaat na alle migraties.

---

## 3.2 Mogelijke afwijkingen in de echte database

Als migraties **niet allemaal** of **niet in volgorde** zijn gedraaid, of er handmatige wijzigingen zijn, kunnen onderstaande afwijkingen voorkomen. Label zoals gevraagd.

### Ontbrekende tabel

- **modules** — Migratie 20250216000000 wijzigt alleen kolommen van `modules` (ALTER). Als `modules` nooit is aangemaakt (bijv. 20250221000000 niet gedraaid), ontbreekt de tabel en kunnen 20250216000000-seeds falen.
- **activity_logs** (view) — Als 20250224000000 niet is gedraaid: view ontbreekt → fout “relation public.activity_logs does not exist”.
- **tasks, finance_entries, emails, settings, recurring_expenses, notes, module_locks, ai_notes, auto_entries, leads, meeting_notes** — Kunnen ontbreken als 20250220000000 / 20250220000001 / 20250221000000 niet (volledig) zijn gedraaid.

### Ontbrekende kolom

- **profiles:** bsn, iban, length_cm, weight_kg, kenteken — Ontbreken als 20250221000000 of 20250222000000 (kenteken) niet zijn gedraaid.
- **activity_log:** actor_user_id, actor_email, entity_type, entity_id, metadata — Ontbreken als alleen 20250216000000 is gedraaid en 20250219100000 niet (dan blijft user_id bestaan).
- **activity_log:** table_name, row_id, payload — Ontbreken als 20250224000000 niet is gedraaid; view of code die deze kolommen verwacht kan falen.
- **auto_entries:** title, notes, odometer_km — Bekend probleem; ontbreken als auto_entries vóór 20250221000000/20250222000000 is aangemaakt en die migraties niet zijn gedraaid.
- **finance_entries:** category — Ontbreken als oude finance_entries zonder category bestaat en de ADD COLUMN niet is uitgevoerd.

### Verkeerde kolom

- **activity_log:** kolom **user_id** (oud schema) — Verkeerd als die nog bestaat; doel is actor_user_id. Duidt op niet gedraaide migratie 20250219100000.

### Verkeerde datatype

- Geen in doelarchitectuur; length_cm/weight_kg zijn in de app als string bedoeld (text is correct).

### Verkeerde constraint

- **profiles.role:** CHECK (role IN ('ADMIN','USER')) — Verkeerd (uppercase); doel is ('admin', 'user'). Ontstaat als 20250219200000 niet is gedraaid na 20250216000000.

### Verkeerde RLS

- **profiles:** Een policy die **is_admin_user()** (of iets dat profiles leest) aanroept → **Verkeerde RLS** en oorzaak van “infinite recursion detected in policy for relation 'profiles'”. Oplossing: alleen profiles_select_own en profiles_update_own (auth.uid() = id), zoals in 20250223000000.
- **activity_log:** Oude policies “Users can read own activity_log” / “Users can insert own activity_log” op **user_id** — Verkeerde RLS als de tabel al naar actor_user_id is gemigreerd maar oude policies niet zijn gedropt (20250219100000 zou ze droppen).

### Verouderd schema

- **activity_log** met alleen id, user_id, action, created_at — Verouderd schema (vóór actor_user_id, entity_type, entity_id, metadata). Komt voor als 20250216000000 wel is gedraaid maar 20250219000000/20250219100000 niet (CREATE TABLE IF NOT EXISTS wijzigt bestaande tabel niet).
- **profiles** met alleen id, role, full_name (zonder bsn, iban, length_cm, weight_kg, kenteken) — Verouderd als latere profiel-migraties niet zijn gedraaid.

---

# Deel 4 — Herstelrapport (samenvatting)

## 4.1 Doel

Eén **geconsolideerde eindstaat** die voldoet aan de doelarchitectuur (Deel 1), zonder data te verwijderen en zonder oude migraties automatisch opnieuw te draaien.

## 4.2 Aanbevolen volgorde van herstel (concept)

1. **Inventarisatie in Supabase**  
   Table Editor + SQL: welke tabellen/kolommen/policies/views/functies bestaan er echt? Resultaat naast dit rapport leggen.

2. **Ontbrekende tabellen**  
   Modules eerst (als die ontbreekt), dan overige tabellen (tasks, finance_entries, emails, settings, recurring_expenses, notes, module_locks, ai_notes, auto_entries, leads, meeting_notes) volgens doeldefinitie.

3. **profiles**  
   Ontbrekende kolommen toevoegen (bsn, iban, length_cm, weight_kg, kenteken). Role lowercase + constraint. RLS: alle policies op profiles droppen en alleen SELECT/UPDATE op auth.uid() = id (geen is_admin_user() op profiles).

4. **activity_log**  
   Als user_id nog bestaat: migreren naar actor_user_id (+ actor_email, entity_type, entity_id, metadata); oude policies droppen; nieuwe policies (insert own, select own or admin). Optioneel: table_name, row_id, payload toevoegen.

5. **activity_logs-view**  
   Aanmaken op activity_log met INSTEAD OF INSERT trigger naar activity_log.

6. **Overige tabellen**  
   Alleen ontbrekende kolommen toevoegen (bijv. auto_entries.title, notes, odometer_km; finance_entries.category).

7. **Functies en triggers**  
   is_admin_user(), handle_new_user(), on_auth_user_created, activity_logs_insert_fn() controleren/aanmaken.

8. **Seeds**  
   Ontbrekende rijen in modules en module_locks (dashboard, taken, financien, email, instellingen; notities).

## 4.3 Wat niet doen

- **Geen data verwijderen** (alleen schema- en policy-aanpassingen).
- **Geen oude migraties automatisch opnieuw draaien** zonder te controleren of dat veilig is voor je huidige staat.
- **Geen SQL genereren** tot je bevestiging geeft; daarna kan één geconsolideerde herstel-migratie (of gerichte scripts) worden voorgesteld.

## 4.4 Volgende stap

Bevestig of je eerst nog de **echte** database wilt inventariseren (lijst tabellen/kolommen/policies uit Supabase Table Editor of `information_schema`/`pg_policies`), en geef daarna **bevestiging** om tot concreet SQL te komen (één herstel-migratie die alleen ontbrekende/verkeerde onderdelen aanpakt).

---

*Einde rapport. Geen SQL in dit document. Wacht op jouw bevestiging voordat er SQL wordt gegenereerd.*
