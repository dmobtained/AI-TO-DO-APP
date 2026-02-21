# Compleet overzicht – app, SQL, n8n en aanpasbaarheid

Dit document brengt het hele plaatje bij elkaar: welke tabellen en API’s er zijn, in welke volgorde je SQL draait, hoe n8n aansluit, en waar je wat aanpast.

---

## 1. Twee taken-systemen (belangrijk)

De app kent **twee gescheiden** taken-bronnen:

| Systeem | Database | Gebruikt door | Doel |
|--------|----------|----------------|------|
| **Product-taken** | **Supabase** tabel `tasks` | Dashboard, pagina Taken, Agenda, Daynote, Zoeken | De taken die gebruikers in de app zien en beheren. Status: `'open'` of `'done'` (lowercase). |
| **Pipeline-taken** | **Prisma** (PostgreSQL, model `Task`) | `/api/tasks`, `/api/ingest`, `/api/n8n/callback` | Ingest-flow: gebruiker plakt tekst → n8n verwerkt → callback schrijft taken in Prisma. Heeft `externalId`, `ingestionId`, `userId`. |

- **Daynote** leest alleen uit **Supabase** `tasks` (open taken van de user) en schrijft in **Supabase** `ai_notes`. Geen Prisma.
- **Ingest/n8n-callback** schrijven alleen in **Prisma** (Ingestion, Task, Summary, WebhookJob). Geen Supabase-tasks.
- Als je alleen de “normale” app gebruikt (dashboard, taken, agenda, daynote): je hebt alleen **Supabase** nodig. Prisma + `DATABASE_URL` zijn alleen nodig voor de ingest-/n8n-pipeline.

**Aanpasbaar:**  
- Product-taken: queries en RLS in `supabase/migrations` (o.a. `20250228000000_tasks_status_lowercase_rls.sql`).  
- Pipeline-taken: `prisma/schema.prisma` en API’s `api/ingest`, `api/n8n/callback`, `api/tasks`.

---

## 2. SQL: migraties vs scripts

### 2.1 Aanbevolen: alleen migraties

Voer **alle** bestanden in `supabase/migrations/` uit **in volgorde van bestandsnaam** (oud naar nieuw). Zie **docs/SUPABASE_INSTELLEN.md** voor de genummerde lijst (1–21).

- Lokaal met Supabase CLI: `npx supabase db push`.
- Handmatig: in Supabase SQL Editor elk migratiebestand plakken en uitvoeren.

### 2.2 Scripts (alleen als aanvulling of herstel)

| Script | Wanneer gebruiken |
|--------|--------------------|
| `supabase/scripts/agenda_events_table.sql` | Alleen als je **geen** migraties 20250226* hebt gedraaid en agenda_events nog niet bestaat. Anders: migraties 16–17 gebruiken. |
| `supabase/scripts/run_all_phases_1_to_4.sql` | All-in-one voor debts, investments, functies, triggers, liters. Alleen als je geen (of niet alle) migraties 20250225* hebt; vereist dat `is_admin_user()` al bestaat (migratie 5/6). |
| `supabase/scripts/inspect_current_schema.sql` | Alleen om te controleren welke tabellen/kolommen er zijn (read-only). |

**Aanpasbaar:** Nieuwe wijzigingen het liefst als **nieuwe migratie** in `supabase/migrations/` met datum-prefix (bijv. `20250301000000_beschrijving.sql`), niet als los script. Dan blijft de volgorde duidelijk.

---

## 3. n8n: flows en env-variabelen

### 3.1 Daynote (product-taken → AI-notitie)

| Wat | Waar |
|-----|------|
| App | Dashboard: “Genereer Dagnotitie” → `POST /api/ai/daynote` |
| Server | Leest **Supabase** `tasks` (open, user_id), stuurt `{ type: 'daynote', user_id, tasks }` naar webhook |
| n8n | Webhook op URL uit env; branch op `body.type === 'daynote'`; antwoord: `{ note: "..." }` (min. 20 tekens) |
| Server | Schrijft notitie in **Supabase** `ai_notes` |

**Env:** `N8N_AI_HUB_WEBHOOK` of `NEXT_PUBLIC_N8N_AI_HUB_WEBHOOK`  
**Doc:** docs/N8N_DAYNOTE_FLOW.md

### 3.2 Ingest (tekst → n8n → Prisma-taken)

| Wat | Waar |
|-----|------|
| App / externe caller | `POST /api/ingest` met `{ rawText, requestId }` |
| Server | Maakt Prisma Ingestion + WebhookJob, stuurt naar n8n o.a. `jobId`, `ingestionId`, `rawText`, `callbackUrl`, `callbackSecret` |
| n8n | Verwerkt tekst, roept **callback** aan: `POST /api/n8n/callback` met `jobId`, `ingestionId`, `summaryText`, `copyText`, `tasks[]` |
| Server | `/api/n8n/callback` schrijft in **Prisma** (Summary, Task upserts, Ingestion/WebhookJob update) |

**Env:** `N8N_INGEST_WEBHOOK_URL`, `APP_BASE_URL`, `N8N_CALLBACK_SECRET`  
**Prisma:** `DATABASE_URL` moet naar dezelfde of aparte PostgreSQL (waar Prisma-tabellen staan).

### 3.3 Overige n8n-webhooks (optioneel)

Zie **docs/N8N_HANDIG_VOOR_DEZE_APP.md** voor o.a.:

- E-mail AI-antwoord, financiën-nieuws, financiën-chat  
- Vergaderingen-samenvatting, schulden-analyse (AI)

**Aanpasbaar:** Welke URL bij welke env hoort staat in die doc en in de code (zoek op de env-naam). Nieuwe flow = nieuwe env + aanroep in de app.

---

## 4. Environment-variabelen (volledig)

| Variabele | Verplicht | Gebruik |
|-----------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Ja (voor app-data) | Supabase project-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ja | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Alleen admin/modules | Admin-API’s, modules-lijst, profile-role |
| `N8N_AI_HUB_WEBHOOK` of `NEXT_PUBLIC_N8N_AI_HUB_WEBHOOK` | Voor daynote | Daynote-flow |
| `N8N_INGEST_WEBHOOK_URL` | Voor ingest-flow | n8n ingest-webhook |
| `APP_BASE_URL` | Voor ingest-flow | Basis-URL van de app (voor callback) |
| `N8N_CALLBACK_SECRET` | Voor ingest/callback | Geheim in header `x-n8n-callback-secret` |
| `DATABASE_URL` | Voor Prisma (ingest/callback) | PostgreSQL-connection string voor Prisma |

Zonder Supabase-url/key werkt login en alle Supabase-data niet. Zonder n8n-variabelen werken daynote/ingest niet; de rest van de app wel.  
Voorbeeldlijst: **.env.example** in de projectroot.

---

## 5. Waar wat aanpassen (aanpasbaar)

| Wil je… | Waar |
|---------|------|
| Nieuwe Supabase-tabel of kolom | Nieuwe migratie in `supabase/migrations/`; bijwerken **SUPABASE_INSTELLEN.md** en eventueel dit overzicht. |
| Taken (product) aanpassen | Migraties voor `tasks`, RLS, triggers; frontend o.a. `app/(app)/dashboard/taken/page.tsx`, `app/(app)/dashboard/page.tsx`. |
| Ingest/pipeline-taken aanpassen | `prisma/schema.prisma`, `api/ingest`, `api/n8n/callback`, `api/tasks`. |
| Daynote-payload of -response wijzigen | `app/api/ai/daynote/route.ts`; n8n-flow en **N8N_DAYNOTE_FLOW.md**. |
| Nieuwe n8n-flow toevoegen | Nieuwe env; in de app de juiste pagina/component: fetch naar die URL; doc in **N8N_HANDIG_VOOR_DEZE_APP.md**. |
| Modules (aan/uit, volgorde) | Tabel **modules** (kolommen: `is_active`, `position`, `developer_mode`). Code: `lib/dashboard-auth.ts`, `app/api/modules/`, **DashboardShell**. |
| Foutmeldingen / timeouts | Per pagina of API: toast/error handling (bijv. agenda, financiën bank, taken) en evt. timeout in fetch. |

---

## 6. Logica en foutafhandeling (kort)

- **Taken (Supabase):** Merge bij refetch zodat net toegevoegde taken niet verdwijnen; status `'open'`/`'done'`.  
- **Financiën bank:** Insert met timeout; bij fout of timeout duidelijke toast.  
- **Agenda:** Insert/delete/import: bij fout toast met `error.message`; bij laden fout toast.  
- **Daynote:** Bij mislukte `ai_notes`-insert geeft de API nu een fout terug i.p.v. stil te slikken.  
- **Modules:** Select alleen kolommen die in migraties bestaan: `id`, `name`, `is_active`, `position`, `developer_mode` (geen `slug`/`enabled`/`status`/`order_index` in de standaard-select).

Met dit overzicht en **SUPABASE_INSTELLEN.md** heb je het hele plaatje: SQL-volgorde, scripts, twee taken-systemen, n8n en waar je alles aanpast.
