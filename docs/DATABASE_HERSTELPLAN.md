# Database-analyse en herstelplan

**Doel:** Je huidige database vergelijken met de beoogde architectuur (zoals in migraties en app gedefinieerd) en een concreet herstelplan geven. Geen code — alleen analyse en stappen.

---

## 1. Doelarchitectuur (wat de app verwacht)

### 1.1 Tabellen en hoofdkolommen

| Tabel | Doel | Verplichte kolommen / eigenschappen |
|-------|------|-------------------------------------|
| **profiles** | Gebruikersprofiel, rol, persoonlijke velden | id (PK, ref auth.users), role ('admin'\|'user'), full_name, bsn, iban, length_cm, weight_kg, kenteken. RLS: alleen eigen rij SELECT/UPDATE. Geen policy die is_admin_user() aanroept (voorkomt recursie). |
| **tasks** | Taken + beslissingslog | id, user_id, title, details, status (OPEN/DONE), priority, due_date, context, estimated_time, energy_level, tags, created_at. RLS: eigen user_id. |
| **finance_entries** | Bank, snelle uitgave, secties | id, user_id, type (income/expense), title, amount, entry_date, category, created_at. RLS: eigen user_id. |
| **emails** | Inbox | id, user_id, subject, sender, body, category, requires_action, created_at. RLS: eigen user_id. |
| **settings** | Key-value (o.a. e-mail koppeling) | id, key (unique), value, user_id (optioneel). RLS: eigen user_id of global. |
| **modules** | Feature flags / module-aan/uit | id, name (unique), is_active, position, developer_mode. RLS: SELECT voor iedereen; ALL alleen voor admin (is_admin_user()). Seed: dashboard, taken, financien, email, instellingen. |
| **activity_log** | Audit (admin “wie wat doet”) | id, created_at, actor_user_id, actor_email, action, entity_type, entity_id, metadata (jsonb). Optioneel (voor compatibiliteit): table_name, row_id, payload. RLS: INSERT eigen actor_user_id; SELECT eigen of admin. |
| **activity_logs** | Alias voor activity_log | View op activity_log (+ eventueel table_name, row_id, payload) met INSTEAD OF INSERT trigger naar activity_log. Bestaat zodat code/triggers die "activity_logs" verwachten niet falen. |
| **recurring_expenses** | Vaste lasten (optioneel) | id, user_id, title, amount, day_of_month, is_active, created_at. RLS: eigen user_id. |
| **notes** | Notities-module | id, user_id, title, content, pinned, created_at, updated_at. RLS: eigen of admin. |
| **module_locks** | Lock notities e.d. | slug (PK), locked, updated_at. RLS: read authenticated; write admin. Seed: notities. |
| **ai_notes** | Dagnotitie (AI) | id, user_id, note, created_at. RLS: eigen user_id. |
| **auto_entries** | Auto (tank, onderhoud, reparatie, aanschaf) | id, user_id, type (fuel/maintenance/repair/purchase), title, amount, entry_date, notes, odometer_km, created_at. RLS: eigen user_id. |
| **leads** | Business pipeline | id, user_id, title, stage (lead/gesprek/deal), notes, created_at, updated_at. RLS: eigen user_id. |
| **meeting_notes** | Vergaderingen | id, user_id, content, summary, created_at, updated_at. RLS: eigen user_id. |

### 1.2 Functies en triggers

- **is_admin_user()** — retourneert true als profiles.role = 'admin' voor auth.uid(). SECURITY DEFINER, search_path = public. Wordt gebruikt in RLS van o.a. activity_log, modules, notes. **Niet** gebruiken in een policy op profiles zelf (oneindige recursie).
- **handle_new_user()** — trigger op auth.users AFTER INSERT: insert in profiles (id, role, full_name) met ON CONFLICT DO NOTHING/UPDATE. Rol uit raw_user_meta_data of default 'user'.
- **activity_logs_insert_fn()** — INSTEAD OF INSERT op view activity_logs: schrijft door naar activity_log (inclusief table_name, row_id, payload als die kolommen bestaan).

### 1.3 RLS-kernregels

- **profiles:** Alleen `auth.uid() = id` voor SELECT en UPDATE. Geen extra policy die is_admin_user() of iets dat profiles leest aanroept.
- **activity_log:** INSERT met actor_user_id = auth.uid(); SELECT met actor_user_id = auth.uid() OR is_admin_user().
- **modules:** SELECT voor authenticated; INSERT/UPDATE/DELETE alleen is_admin_user().
- Overige user-tabellen: alle bewerkingen beperkt tot auth.uid() = user_id.

---

## 2. Huidige staat volgens migraties (volgorde)

De migraties leggen deze volgorde en inhoud vast:

1. **20250215000000** — profiles (id, role, full_name), RLS select_own / update_own.
2. **20250216000000** — modules-kolommen (is_active, position, developer_mode); recurring_expenses; **activity_log met user_id** (oud schema); profiles.role toevoegen indien afwezig; seed modules. **Let op:** modules-tabel wordt hier niet aangemaakt, alleen kolommen toegevoegd — als modules nog niet bestaat, ontbreekt die tabel.
3. **20250218000000** — full_name op profiles.
4. **20250219000000** — activity_log opnieuw gedefinieerd met **actor_user_id**, entity_type, entity_id, metadata; is_admin_user(); RLS voor activity_log. Bij CREATE TABLE IF NOT EXISTS: als de tabel al bestaat (met user_id van stap 2), blijft het oude schema staan tenzij er later een migratie op draait.
5. **20250219100000** — Migratie van activity_log: user_id → actor_user_id, toevoegen actor_email, entity_type, entity_id, metadata; oude policies droppen; is_admin_user() en handle_new_user() + trigger on_auth_user_created.
6. **20250219200000** — roles lowercase (admin/user); profiles constraint; is_admin_user() en handle_new_user() aangepast.
7. **20250220000000** — module_locks + RLS + seed notities.
8. **20250220000001** — notes + RLS.
9. **20250221000000** — profiles (bsn, iban, length_cm, weight_kg); tasks; finance_entries (incl. category); emails; settings; modules (CREATE TABLE + seed); ai_notes; auto_entries (met title, notes, odometer_km); leads; meeting_notes. Alle met RLS.
10. **20250222000000** — auto_entries: title, notes, odometer_km toevoegen indien ontbreekt; profiles: kenteken toevoegen.
11. **20250223000000** — profiles RLS: alle policies droppen, alleen profiles_select_own en profiles_update_own (auth.uid() = id), om recursie te verhelpen.
12. **20250224000000** — activity_log: table_name, row_id, payload toevoegen; view activity_logs + INSTEAD OF INSERT trigger.

**Afhankelijkheden:** 20250216000000 veronderstelt dat **modules** al bestaat (alleen ALTER). In 20250221000000 staat CREATE TABLE IF NOT EXISTS voor modules — dus als je eerst 20250221000000 draait, wordt modules daar aangemaakt. Als je strikt 1→2→…→12 draait, moet modules ergens vóór migratie 2 bestaan of migratie 2 faalt op de modules-kolommen. In de praktijk is vaak eerst een eerdere setup gedraaid of is modules handmatig aangemaakt.

---

## 3. Bekende problemen (ervaring uit eerdere fouten)

- **"Could not find the 'odometer_km' column of 'auto_entries'"** — auto_entries is soms zonder odometer_km (en/of zonder title, notes) aangemaakt. Oplossing: migratie 10 (of 9 opnieuw) draaien; migratie 10 voegt ontbrekende kolommen toe.
- **"Could not find the 'title' column of 'auto_entries'"** — idem; title/notes ontbreken. Zelfde herstel: migratie 10.
- **"infinite recursion detected in policy for relation 'profiles'"** — Er staat een RLS-policy op profiles die is_admin_user() (of iets dat profiles leest) aanroept. Oplossing: migratie 11 draaien (alle policies op profiles vervangen door alleen eigen rij).
- **"relation public.activity_logs does not exist"** — Code of Supabase-features verwachten de relation "activity_logs". Oplossing: migratie 12 (view activity_logs + trigger).
- **"column table_name / row_id / payload of relation activity_logs does not exist"** — View of onderliggende activity_log mist die kolommen. Oplossing: migratie 12 draait activity_log uitbreiden en view bijwerken.

---

## 4. Mogelijke afwijkingen in je echte database

Je **werkelijke** database kan afwijken doordat:

- Migraties in een andere volgorde of gedeeltelijk zijn gedraaid.
- Tabellen handmatig of via een oud script zijn aangemaakt (bijv. activity_log met alleen user_id, of auto_entries zonder title/notes/odometer_km).
- Extra policies op profiles zijn toegevoegd (bijv. “admin mag alle profielen lezen” met is_admin_user()) — dat veroorzaakt recursie.
- De tabel **modules** ontbreekt als alleen migratie 2 is gedraaid en 9 nog niet (migratie 2 wijzigt alleen kolommen van modules).
- **activity_log** nog het oude schema heeft (user_id in plaats van actor_user_id) als 20250219100000 niet is gedraaid.
- **profiles** nog oude role-waarden (ADMIN/USER) of geen kenteken/bsn/iban/length_cm/weight_kg heeft.

---

## 5. Herstelplan (stappen, geen code)

### Fase A: Inventarisatie (in Supabase)

1. **Table Editor** — Controleer welke tabellen bestaan: profiles, tasks, finance_entries, emails, settings, modules, activity_log, recurring_expenses, notes, module_locks, ai_notes, auto_entries, leads, meeting_notes. Noteer ontbrekende tabellen.
2. **profiles** — Controleer kolommen: id, role, full_name, bsn, iban, length_cm, weight_kg, kenteken. Noteer ontbrekende kolommen.
3. **activity_log** — Controleer kolommen: id, created_at, actor_user_id, actor_email, action, entity_type, entity_id, metadata. Zo ook of table_name, row_id, payload bestaan (voor view). Controleer of er nog een kolom user_id is (oud schema).
4. **auto_entries** — Controleer kolommen: id, user_id, type, title, amount, entry_date, notes, odometer_km, created_at. Noteer ontbrekende kolommen.
5. **RLS / Policies** — Voor **profiles**: lijst alle policies. Als er een policy bij staat die is_admin_user() of een functie die profiles leest gebruikt, noteer dat (oorzaak recursie).
6. **Views** — Controleer of de view **activity_logs** bestaat. Zo niet, dan verklaart dat “relation activity_logs does not exist”.
7. **Functies** — Controleer of is_admin_user() en handle_new_user() bestaan. Controleer of trigger on_auth_user_created op auth.users bestaat.
8. **Seeds** — modules: bestaan er rijen voor dashboard, taken, financien, email, instellingen? module_locks: bestaat er een rij voor notities?

### Fase B: Volgorde van herstel

1. **Modules-tabel** — Als die ontbreekt: eerst de definitie van modules (inclusief RLS en seed) uit de migraties toepassen (zoals in 20250221000000), zodat latere migraties die op modules bouwen niet falen.
2. **profiles** — Ontbrekende kolommen toevoegen (full_name, bsn, iban, length_cm, weight_kg, kenteken) via ADD COLUMN IF NOT EXISTS. Role lowercase afdwingen (constraint + eventueel data-update) zoals in 20250219200000. **RLS:** alle policies op profiles verwijderen en alleen twee policies laten: SELECT en UPDATE met auth.uid() = id (zoals in 20250223000000). Geen policy op profiles die is_admin_user() aanroept.
3. **activity_log** — Als de tabel nog user_id heeft: migreren naar actor_user_id (data kopiëren, user_id droppen), actor_email, entity_type, entity_id, metadata toevoegen. Oude policies droppen, nieuwe (insert own, select own or admin) aanmaken. Kolommen table_name, row_id, payload toevoegen indien vereist voor de view. Functie is_admin_user() bijwerken naar lowercase role.
4. **activity_logs-view** — View aanmaken op activity_log (alle benodigde kolommen, inclusief table_name, row_id, payload). INSTEAD OF INSERT trigger zodat inserts in activity_logs naar activity_log gaan.
5. **Overige tabellen** — Ontbrekende tabellen aanmaken (tasks, finance_entries, emails, settings, recurring_expenses, notes, module_locks, ai_notes, auto_entries, leads, meeting_notes) volgens de doelarchitectuur. Bestaande tabellen: alleen ontbrekende kolommen toevoegen (bijv. finance_entries.category, auto_entries.title/notes/odometer_km).
6. **Triggers** — Zorgen dat handle_new_user() en trigger on_auth_user_created op auth.users aanwezig zijn, zodat nieuwe gebruikers een profiel krijgen.
7. **Seeds** — Ontbrekende module- en module_locks-rijen toevoegen.

### Fase C: Nazorg

1. **Schema-cache** — Na wijzigingen in Supabase kan de schema-cache even achterlopen; bij aanhoudende fouten even wachten of opnieuw inloggen.
2. **Test** — Login, profiel laden, dashboard, financiën (bank), auto (toevoegen), admin activity-tab, notities. Controleren op foutmeldingen over ontbrekende kolommen of relations.
3. **Documentatie** — SUPABASE_INSTELLEN.md bijwerken als je een andere volgorde of extra stappen vastlegt.

---

## 6. Samenvatting

- **Doel:** Eén consistente staat: alle tabellen en kolommen zoals in sectie 1, profiles-RLS zonder recursie, activity_log + view activity_logs met eventueel table_name/row_id/payload, en alle functies/triggers/seeds in orde.
- **Aanpak:** Eerst inventariseren (fase A), dan in de volgorde van fase B herstellen (eventueel door de bestaande migraties 1–12 in de juiste volgorde opnieuw uit te voeren, of door gerichte SQL alleen voor de ontbrekende/verkeerde onderdelen). Geen code in dit document — de concrete SQL staat in de migratiebestanden; dit plan bepaalt alleen **wat** je controleert en **in welke volgorde** je herstelt.

Als je wilt, kan ik in een vervolgstap **wel** concrete SQL-scripts voor je huidige situatie voorstellen (bijv. één “herstel”-migratie die alleen ontbrekende stukken toevoegt en foute policies vervangt).
