# Systeemoverzicht – AI TO DO APP (Datadenkt)

Overzicht van alle functies, pagina’s, integraties en techniek.

---

## 1. Authenticatie & rollen

- **Login:** Supabase Auth (e-mail/wachtwoord). Loginpagina wordt niet aangepast (design-regel).
- **Rollen:** `admin` | `user` (lowercase, overal consistent).
- **Bron van rol:** Eerst `user_metadata.role`, daarna tabel `profiles` (kolom `role`).
- **Middleware:** Beschermt alle app-routes; niet-ingelogde gebruikers gaan naar `/`. Admin-only route `/admin` wordt afgeschermd.
- **Profiles:** Tabel `profiles` met o.a. `role`, `email`, `full_name` (RLS: eigen rij).

---

## 2. Feature flags / modules

Modules staan in de tabel **`modules`** (o.a. `name`, `slug`, `is_active`, `enabled`, `status`).  
Deze bepalen welke onderdelen een **user** ziet; **admin** ziet alles.

| Key | Beschrijving |
|-----|--------------|
| `dashboard_tasks_list` | Lijst open taken op dashboard + takenpagina (core) |
| `finance_module` | Financiën-module (core) |
| `email_module` | E-mail / inbox (core) |
| `decision_log` | Beslissingslogboek-widget op dashboard |
| `cashflow_forecast` | Cashflow-voorspelling-widget |
| `financial_warnings` | Financiële waarschuwingen-widget |
| `productivity_meter` | Productiviteitsmeter-widget |
| `focus_today` | Focusblok vandaag (in dashboard-logica) |
| `finance_ai_news` | (key aanwezig, gebruik in app optioneel) |
| `finance_chatbot` | (key aanwezig, gebruik in app optioneel) |

**Core modules** (`dashboard_tasks_list`, `email_module`, `finance_module`) zijn altijd zichtbaar voor iedereen.

---

## 3. Pagina’s & routes (ingelogde app)

Alle onderstaande routes zitten achter login + middleware.

| Route | Functie |
|-------|--------|
| **/dashboard** | Hoofddashboard: financiële kern, weer, snelle uitgave, weekbudget, open taken vandaag, business pipeline, top 3 prioriteiten, dagnotitie (AI), open taken-lijst, collapsible “Geavanceerde inzichten” (cashflow, waarschuwingen, productiviteit, beslissingslogboek). |
| **/dashboard/taken** | Takenbeheer: stat cards (open/vandaag/overdue), formulier nieuwe taak (titel, details, prioriteit, deadline, context, tijd, energie), lijst met afvinken/verwijderen. Overdue = rode rand, normaal = blauwe rand. |
| **/dashboard/email** | E-mail: inbox-lijst (links, w-80) + detail + AI-antwoord (webhook). Lezen/selectie; developer mode kan inbox voor niet-admin uitzetten. |
| **/dashboard/instellingen** | Instellingen: e-mailadres, rol-badge, toggle “E-mail koppeling aan”, uitloggen. Geen Developer Mode meer. |
| **/dashboard/financien** | Financiën-overzicht: 3 stat cards (totaal salaris, vaste lasten, vrij bedrag), sectie-accordion, “Snel naar”-links. |
| **/dashboard/financien/bank** | Bank / saldo: finance_entries voor bank. |
| **/dashboard/financien/lasten** | Vaste lasten. |
| **/dashboard/financien/beleggen** | Beleggen. |
| **/dashboard/financien/belasting** | Belasting. |
| **/auto** | Auto: 4 stat cards (kosten/jaar, per km, aanschaf, waarde), tabs Tankbeurten / Onderhoud / Reparaties met empty states. |
| **/business** | Business pipeline: 3 stat cards (leads, conversie, deals), 3 kolommen (Lead, Gesprek, Deal) met empty states. |
| **/notities** | Notities: grid notitiekaarten, “Nieuwe notitie”-knop, detail-placeholder. |
| **/vergaderingen** | Vergaderingen: textarea notities + knop “AI samenvatten”, outputkaart met loader. |
| **/valuta** | Valuta: wisselkoersen (lib/currency), quick pairs, van/naar + bedrag, refresh. |
| **/persoonlijke-info** | Persoonlijke info: BSN, IBAN, lengte, gewicht; copy-to-clipboard, bewerk-toggle voor lengte/gewicht. |
| **/admin** | Alleen admin: tabs Activity / Users / System. Activity log tabel (Action, Entity, User, Date, Metadata met uitklapbare JSON), gebruikersbeheer (rol wijzigen), system-placeholder. |

**Overige routes:**

- **/** = landingspagina (niet aangepast; waarschijnlijk redirect of login).
- **/login** = loginpagina (niet aangepast).
- **/mail** = mail-pagina (aparte route; e-mailfunctionaliteit ook onder /dashboard/email).

---

## 4. Data (Supabase-tabellen)

| Tabel | Gebruik |
|-------|--------|
| **profiles** | role, email, full_name; gekoppeld aan auth.user. |
| **tasks** | Taken: title, status (OPEN/DONE), details, priority, due_date, context, estimated_time, energy_level, tags, user_id. Ook gebruikt voor [DECISION]-beslissingen en door daynote. |
| **finance_entries** | Financiële regels: type (income/expense), amount, entry_date, user_id, evt. category. |
| **emails** | E-mail-inbox: subject, sender, body, category, requires_action, user_id. |
| **settings** | Key-value (bijv. developer_mode_mail). |
| **modules** | Feature modules: name, slug, is_active, enabled, status, order_index. |
| **activity_log** | Audit: actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at. |
| **ai_notes** | Opgeslagen AI-notities (daynote API schrijft hier). |

RLS: waar van toepassing per user_id of admin.

---

## 5. API-routes

| Endpoint | Methode | Functie |
|----------|---------|--------|
| **/api/audit** | POST | Client audit: action, entity_type, entity_id, metadata; server vult actor. |
| **/api/ai/daynote** | POST | Dagnotitie: haalt open tasks op, roept N8N AI Hub-webhook aan, kan in ai_notes schrijven. |
| **/api/ai** | - | AI-route (evt. algemeen). |
| **/api/admin/users** | GET | Lijst gebruikers (admin), uit profiles. |
| **/api/admin/users/[id]** | PATCH | Rol wijzigen (admin). |
| **/api/modules** | GET/POST | Modules ophalen/aanmaken. |
| **/api/modules/[id]** | PATCH | Module bijwerken; schrijft activity_log. |
| **/api/tasks** | - | Taken CRUD (indien gebruikt). |
| **/api/tasks/[id]** | - | Taak bij ID. |
| **/api/config** | - | Configuratie. |
| **/api/n8n/callback** | - | N8N-callback. |
| **/api/jobs/[jobId]** | - | Job-status. |
| **/api/ingest** | - | Ingest (data). |
| **/api/search** | - | Zoeken in tasks + finance_entries. |

---

## 6. Externe integraties

- **Supabase:** Auth, database, RLS.
- **Open Meteo:** Weer op dashboard (latitude/longitude Amsterdam).
- **N8N AI Hub:** Webhook voor dagnotitie (env: N8N_AI_HUB_WEBHOOK of NEXT_PUBLIC_N8N_AI_HUB_WEBHOOK). E-mail-pagina gebruikt aparte webhook-URL voor AI-antwoord.
- **Valuta:** Wisselkoersen via lib/currency (externe API of cache).

---

## 7. Technische stack

- **Next.js 14** (App Router), **React 18**, **TypeScript**
- **Tailwind CSS**, **Lucide-react**
- **Supabase** (Auth + Postgres, @supabase/ssr, supabase-js)
- **Premium Executive SaaS** design: Soft Light-thema, componenten in `components/ui/` (Card, StatCard, SectionHeader, Button, Input, Badge, Tabs, Table, EmptyState, PageContainer, Accordion)

---

## 8. Wat het systeem (nu) niet doet

- Geen drag-and-drop dashboard layout (geannuleerd in refactor).
- Geen aanpassing van loginpagina of root landingspagina in deze refactor.
- Developer Mode is volledig uit de UI verwijderd (instellingen).
- Geen wijzigingen aan RLS of auth-logica in deze refactor.

---

*Laatste update: op basis van de huidige codebase; documentatie kan naast de code verder worden bijgehouden.*
