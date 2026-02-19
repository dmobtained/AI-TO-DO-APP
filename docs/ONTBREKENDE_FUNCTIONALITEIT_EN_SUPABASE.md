# Ontbrekende functionaliteit & Supabase-checklist

Twee overzichten: (1) wat er in de app nog niet werkt of nog placeholder is, (2) wat je in Supabase moet aanmaken of uitvoeren. **Geen code bouwen** – alleen lijsten.

---

## 1. Ontbrekende functionaliteit (onder elkaar)

### Dashboard
- **Beslissingslogboek:** Beslissingen worden lokaal getoond maar (waarschijnlijk) niet persistent opgeslagen in de database.
- **Snelle uitgave / weekbudget:** Als er geen koppeling met `finance_entries` of aparte tabel is, worden bedragen niet blijvend opgeslagen.

### Dashboard – Financiën
- **Secties (Abonnementen, Huur, Verzekeringen, enz.):** Alleen “Placeholder item 1” en “Placeholder item 2”; geen echte CRUD per sectie of koppeling naar vaste lasten/entries.
- **Totaal salaris / vaste lasten / vrij bedrag:** Berekening klopt alleen als `finance_entries` gevuld is; er is geen aparte “salaris”-bron als die niet in entries zit.

### Dashboard – Financiën → Bank / Lasten / Beleggen / Belasting
- **Bank:** Werkt met `finance_entries` (toevoegen/verwijderen) – OK als tabel bestaat.
- **Vaste lasten / Beleggen / Belasting:** Gebruiken ook `finance_entries`; ontbreken van echte categorieën of subtypen (bijv. `category` of `subtype`) kan overzicht beperkt maken.

### E-mail (/dashboard/email en /mail)
- **Inbox:** Leest uit tabel `emails`; als die tabel of RLS ontbreekt, werkt het niet.
- **AI-antwoord:** Afhankelijk van externe webhook; als die niet geconfigureerd is, gebeurt er niets.

### Taken (/dashboard/taken)
- **Taken CRUD:** Werkt met tabel `tasks`; als die ontbreekt, werkt niets.

### Goud (/goud)
- **Trendfilter:** In de UI staat letterlijk “(placeholder)” – nog geen echte filter of logica.

### Auto (/auto)
- **Tankbeurten / Onderhoud / Reparaties:** Empty states met “Voeg een tankbeurt toe (placeholder)” – geen echte invoer of opslag (geen tabellen/API voor tankbeurten, onderhoud, reparaties).
- **Aanschafwaarde / kosten per jaar:** Geen persistentie; moet nog gekoppeld worden aan data of uitgaven.

### Business (/business)
- **Leads / Gesprekken / Deals:** Alle drie “+ Toevoegen (placeholder)” – geen CRUD, geen tabel of API voor leads/pipeline.

### Notities (/notities)
- **Werkt** als tabel `notes` en migraties zijn gedraaid; anders: foutmelding + “Opnieuw laden”.

### Vergaderingen (/vergaderingen)
- **AI samenvatten:** Geeft nu een vaste “Placeholder samenvatting”-tekst; geen echte AI/webhook-koppeling.
- **Notities:** Alleen lokaal in de textarea; niet opslaan in database.

### Valuta (/valuta)
- **Werkt** met Frankfurter API; geen extra Supabase-tabellen nodig.

### Persoonlijke info (/persoonlijke-info)
- **BSN / IBAN:** Hardcoded waarden; niet uit database, niet bewerkbaar opslaan.
- **Lengte / gewicht:** Alleen component-state; niet opslaan in Supabase (geen tabel of kolommen).

### Admin (/admin)
- **Activity-tab:** Werkt met `activity_log`.
- **Users-tab:** Werkt met `profiles` (rol wijzigen).
- **System-tab:** Letterlijk “Placeholder: systeeminstellingen” – geen echte systeeminstellingen of configuratie.

### Overig
- **Dagnotitie (AI):** API schrijft naar `ai_notes`; werkt alleen als die tabel bestaat en webhook (N8N) is geconfigureerd.
- **Zoeken (/api/search):** Zoekt in `tasks` en `finance_entries`; werkt alleen als die tabellen bestaan.

---

## 2. Wat je in Supabase moet toevoegen/doen

Alleen **wat** er moet zijn; geen scripts bouwen. Voer migraties in volgorde uit (oude → nieuwe datum).

### 2.1 Tabellen die moeten bestaan

| Tabel | Gebruik |
|-------|--------|
| **profiles** | Id (uuid, PK, verwijst naar auth.users), role (text: 'admin' of 'user'), full_name (text), evt. email. Nodig voor rol, welkom-naam, handle_new_user trigger. |
| **tasks** | Taken: o.a. id, user_id, title, details, status (OPEN/DONE), priority, due_date, context, estimated_time, energy_level, tags, created_at. RLS: eigen user_id of admin. |
| **finance_entries** | Financiële regels: id, user_id, type ('income' of 'expense'), amount, entry_date, title/category indien gebruikt. RLS: eigen user_id of admin. |
| **emails** | Inbox: id, user_id, subject, sender, body, category, requires_action, created_at. RLS: eigen user_id (of admin). |
| **settings** | Key-value (bijv. developer_mode_mail, e-mail koppeling): key (of id), value, evt. user_id. RLS naar behoefte. |
| **modules** | Feature-modules: id, name, is_active, position, evt. developer_mode (boolean). Gebruikt door dashboard/feature flags. |
| **activity_log** | Audit: id, created_at, actor_user_id, actor_email, action, entity_type, entity_id, metadata (jsonb). RLS: eigen acties + admin ziet alles. |
| **recurring_expenses** | Vaste lasten (optioneel, als je die apart wilt): id, user_id, title, amount, day_of_month, is_active, created_at. |
| **notes** | Notities-module: id, user_id, title, content, pinned, created_at, updated_at. RLS: eigen of admin (zie bestaande migratie). |
| **module_locks** | Module lock (read-only modus): slug (PK), locked (boolean), updated_at. RLS: authenticated read; alleen admin write. |
| **ai_notes** | Dagnotitie AI: id, user_id, note (text), created_at. RLS: eigen user_id. |

### 2.2 Functies in Supabase

- **is_admin_user()**  
  Retourneert true als `profiles.role = 'admin'` voor `auth.uid()`. Gebruikt door RLS op o.a. activity_log, notes.

- **handle_new_user()**  
  Trigger op `auth.users`: na INSERT een rij in `profiles` met id, role ('user' of 'admin' uit metadata), full_name. Zorg dat tabel `profiles` bestaat vóór je deze trigger aanzet.

### 2.3 Triggers

- **on_auth_user_created** op `auth.users` AFTER INSERT → roept `handle_new_user()` aan (zodat elke nieuwe gebruiker een profile krijgt).

### 2.4 RLS (Row Level Security)

- **profiles:** Gebruikers alleen eigen rij lezen/bijwerken; admin mag alle profielen zien (voor admin-pagina rol wijzigen).
- **tasks, finance_entries, emails, notes, ai_notes:** Eigen rijen (user_id = auth.uid()); admin mag alles (waar van toepassing).
- **activity_log:** INSERT alleen eigen actor_user_id; SELECT eigen of is_admin_user().
- **module_locks:** SELECT voor authenticated; UPDATE/INSERT/DELETE alleen voor is_admin_user().
- **modules:** Naar behoefte (vaak: iedereen lezen, alleen admin wijzigen).
- **settings:** Afhankelijk of je per user of globaal wilt; dan RLS op user_id of alleen admin.

### 2.5 Migraties die je moet uitvoeren (in volgorde)

1. **20250216000000_schema_updates.sql** – modules-kolommen, recurring_expenses, activity_log, profiles.role, seed modules.
2. **20250218000000_profiles_full_name.sql** – kolom full_name op profiles.
3. **20250219000000_activity_log.sql** – activity_log-schema + is_admin_user.
4. **20250219100000_activity_log_fix_and_trigger.sql** – actor_user_id, entity_type, entity_id, metadata, RLS, handle_new_user, trigger on_auth_user_created.
5. **20250219200000_normalize_roles.sql** – role lowercase ('admin'/'user'), is_admin_user en handle_new_user aangepast.
6. **20250220000000_module_locks.sql** – tabel module_locks + RLS + seed notities.
7. **20250220000001_notes.sql** – tabel notes + RLS + is_admin_user voor notes.

**Let op:** In deze migraties worden **niet** aangemaakt: `profiles`, `tasks`, `finance_entries`, `emails`, `settings`, `modules` (eerste definitie), `ai_notes`. Die moet je zelf in Supabase aanmaken (of via een eerdere/eigen migratie) als ze nog niet bestaan. De bestanden hierboven wijzigen of vullen ze alleen aan (bijv. extra kolommen, seed data).

### 2.6 Seed / configuratie in Supabase

- **modules:** Minimaal rijen voor dashboard, taken, financien, email, instellingen (zoals in 20250216000000 of je eigen seed).
- **module_locks:** Minimaal één rij voor slug `'notities'` (locked = false) als je de notities-module gebruikt.

### 2.7 Environment / externe diensten (geen Supabase, wel nodig voor “alles werkt”)

- **N8N / AI-webhook:** `N8N_AI_HUB_WEBHOOK` of `NEXT_PUBLIC_N8N_AI_HUB_WEBHOOK` voor dagnotitie en evt. vergaderingen-samenvatting.
- **E-mail AI-antwoord:** Aparte webhook-URL in de e-mailpagina indien je AI-antwoorden wilt.
- **Supabase URL + anon key:** `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env` (geen placeholder-URL).

---

*Laatste update: op basis van de huidige codebase en migraties; alleen informerend, geen wijzigingen aan code.*
