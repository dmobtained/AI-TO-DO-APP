# App-status: wat niet werkt en wat nog af moet

Overzicht na doorloop van de hele app. Onderaan staat **hoe je het het beste kunt aanpakken**.

---

## 1. Wat nu niet (goed) werkt

### Schuldenpagina (`/dashboard/financien/schulden`)
- **Schuldenlijst is dummy** – De lijst komt uit `DUMMY_DEBTS`; toegevoegde schulden gaan alleen in state en verdwijnen bij verversen. De Supabase-tabel `debts` wordt niet gebruikt.
- **Tabel `debts`** heeft alleen: `name`, `total_amount`, `interest_rate`, `monthly_payment`, `start_date`. Geen `original_amount` of `current_balance`. De UI verwacht die wel (startbedrag vs. nog open).
- **Scenario’s 1–3** – Einddatums en rente zijn vaste dummy-waarden, geen echte berekening.
- **Betalingshistorie** in de uitgeklapte rij is tekst: "Betalingshistorie en simulatie komen hier (dummy)".
- **Aanpak:** Schulden laden/opslaan/verwijderen via Supabase. Ofwel `total_amount` = “nog open” en kolom `original_amount` toevoegen (migratie), ofwel twee kolommen: `original_amount` + `current_balance` en `total_amount` afkeuren/deprecaten.

### Dashboard (`/dashboard`)
- **Fouten worden genegeerd** – Bij mislukte ophalen van taken of finance_entries wordt alleen lege data getoond; geen toast of “Opnieuw proberen”.
- **Weer** – Bij fout wordt stil `setWeather({})` gedaan; gebruiker ziet geen melding.
- **Beslissingslogboek** – Beslissingen worden mogelijk niet in de database opgeslagen (alleen lokaal/getoond).

### Notities (`/notities`)
- Bij **mislukte delete** sluit de dialog toch en is er geen foutmelding.
- Bij **mislukte pin/unpin** geen feedback; bij `data.note` undefined kan de state fout lopen.

### Admin (`/admin`)
- Bij **mislukte rolwijziging** geen melding (toast ontbreekt).
- **System-tab** – Toont letterlijk “Placeholder: systeeminstellingen”; geen echte instellingen.

### Valuta (`/valuta`)
- Bij **API-fout** (Frankfurter) worden stilletjes mock-koersen gebruikt; geen melding dat data offline/cache is.

### Vergaderingen (`/vergaderingen`)
- **“AI samenvatten”** is nep: een `setTimeout` met vaste demo-tekst. Geen echte AI/webhook.
- Notities zelf worden wel opgeslagen via `/api/meeting-notes` (tabel `meeting_notes`).

### Financiën-overzicht (`/dashboard/financien`)
- Bij **fetch-fout** op finance_entries wordt alleen `setEntries([])` gedaan; geen toast of foutmelding.

### Supabase-configuratie
- In `lib/supabaseClient.ts` en server/browser: als `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` ontbreekt, wordt een **placeholder-URL/key** gebruikt. Foutmeldingen zijn dan onduidelijk (bijv. 404 of “invalid key”).

### E-mail
- **AI-antwoord** hangt af van een externe webhook; als die niet geconfigureerd is, gebeurt er niets.
- Webhook-URL staat op sommige plekken **hardcoded** (security-risico); beter via env.

---

## 2. Wat nog “half” of placeholder is

### Financiën-secties (Abonnementen, Huur, etc.)
- Werken met `finance_entries` + category. Als er geen entries met die category zijn, zie je lege secties; geen echte “vaste lasten”-koppeling naar `recurring_expenses` in de overzichtspagina.

### Persoonlijke info (`/persoonlijke-info`)
- BSN/IBAN/lengte/gewicht worden naar `profiles` weggeschreven. Controleren of die kolommen in `profiles` bestaan (migraties: bsn, iban, length_cm, weight_kg).

### Auto (`/auto`)
- Tankbeurten/onderhoud/reparaties gebruiken `/api/auto` en tabel `auto_entries`; dat werkt als de migraties zijn gedraaid. Alleen als die tabel ontbreekt: lege states.

### Business / Leads (`/business`)
- Werkt met `/api/leads` en tabel `leads`. Werkt als de tabel en migraties kloppen.

---

## 3. Database: tabellen die moeten bestaan

Als iets “werkt niet” zonder duidelijke frontend-fout, vaak ontbreekt een tabel of migratie:

| Tabel | Gebruik |
|-------|--------|
| profiles | Auth, rol, kenteken, BSN, IBAN, length_cm, weight_kg |
| tasks | Taken |
| finance_entries | Bank, uitgaven, snelle uitgave, secties (category) |
| recurring_expenses | Vaste lasten (o.a. schuldenpagina cashflow) |
| debts | Schulden (nu niet gebruikt door schuldenpagina) |
| investments | Beleggen |
| agenda_events | Agenda |
| emails | E-mail-inbox |
| settings | O.a. e-mail-koppeling |
| modules | Feature-modules (dashboard) |
| activity_log | Audit / admin |
| notes | Notities |
| ai_notes | Dagnotitie AI |
| module_locks | Notities-module lock |
| leads | Business-pipeline |
| meeting_notes | Vergaderingen |
| auto_entries | Auto (tankbeurten, onderhoud, etc.) |

Migraties in **chronologische volgorde** draaien (zie o.a. `docs/ONTBREKENDE_FUNCTIONALITEIT_EN_SUPABASE.md`).

---

## 4. Aanbevolen aanpak (volgorde)

### Fase 1: Snel veel winst (bugs + duidelijke fouten)
1. **Dashboard** – Bij fout bij ophalen taken/finance: toast + eventueel “Opnieuw proberen”-knop.
2. **Dashboard** – Bij weer-fout: korte melding (“Weer niet beschikbaar”).
3. **Notities** – Alleen dialog sluiten bij succesvolle delete; bij fout toast en dialog open. Pin/unpin: toast bij fout en pin-state alleen updaten als `data?.note` aanwezig is.
4. **Admin** – Toast bij mislukte rolwijziging.
5. **Valuta** – Bij API-fout een korte melding tonen: bv. “Offline / cache-koersen”.
6. **Financiën-overzicht** – Bij fetch-fout: toast en eventueel vorige data laten staan.
7. **Supabase** – Bij placeholder-URL/key: duidelijke fout of waarschuwing (log of runtime check) zodat je direct ziet dat env ontbreekt.

Dit staat ook in `docs/VERBETERPLAN.md` als Prioriteit 1 (1.1–1.7).

### Fase 2: Schulden “echt” maken
1. **Schema** – Bepalen: blijft `debts` met alleen `total_amount`, of kolommen toevoegen (bijv. `original_amount`, `current_balance`)? Of: `total_amount` = huidige schuld en optioneel `original_amount` toevoegen.
2. **Schuldenpagina** – Supabase gebruiken: schulden laden bij mount, bij toevoegen/verwijderen/aanpassen naar DB schrijven en daarna opnieuw laden.
3. **Scenario’s** – Echte berekening (bijv. resterende maanden, geschatte einddatum) op basis van `current_balance` (of `total_amount`) en `monthly_payment`/rente, of AI-response vullen via bestaande webhook.
4. **Betalingshistorie** – Later: aparte tabel (bijv. `debt_payments`) of in een bestaande audit/entries-tabel; eerst kan “dummy”-tekst blijven met een korte toelichting.

### Fase 3: UX en consistentie
- **PageContainer** overal gebruiken waar dat nog niet zo is (zie VERBETERPLAN 2.5).
- **Design tokens** overal; hardcoded kleuren (slate, #2563eb, etc.) vervangen (VERBETERPLAN 2.1, 2.2).
- **Vergaderingen** – Of echte AI/webhook voor “AI samenvatten”, of knop/label duidelijker maken (bijv. “Demo-samenvatting”).

### Fase 4: Security en config
- **Webhook-URL’s** (e-mail AI, N8N, etc.) uit code halen en in env (bijv. `NEXT_PUBLIC_*` of server-only) zetten.
- **Admin** – System-tab vullen met echte systeeminstellingen of tijdelijk verbergen/duidelijk “Binnenkort”-tekst tonen.

### Fase 5: Later (meer werk)
- Virtualisatie voor grote lijsten (admin activiteit, agenda-import, notities).
- Optimistic updates waar zinvol (business, taken).
- Paginatie voor admin-users.
- Toegankelijkheid: labels aan inputs koppelen, grotere touch-targets (zie VERBETERPLAN prioriteit 3).

---

## 5. Samenvatting

| Onderdeel | Status | Eerste stap |
|-----------|--------|-------------|
| Schulden | Dummy data, niet opgeslagen | Schulden koppelen aan Supabase (schema + CRUD) |
| Dashboard | Fouten stil | Toast + “Opnieuw proberen” bij fetch-fout |
| Notities | Foutafhandeling delete/pin | Toast + dialog alleen bij succes sluiten |
| Admin | Geen feedback rol, system placeholder | Toast bij fout; tab duidelijker maken |
| Valuta | Stille fallback | Melding “offline/cache” bij API-fout |
| Vergaderingen | AI = demo | Echte webhook of “Demo”-label |
| Financiën overzicht | Fout stil | Toast bij fetch-fout |
| Supabase env | Placeholder bij ontbreken | Duidelijke fout/waarschuwing |

**Beste volgorde:** Eerst Fase 1 (foutafhandeling), dan Fase 2 (schulden naar Supabase). Daarna Fase 3–5 naar behoefte.

Als je wilt, kan de volgende stap zijn: concrete code-aanpassingen voor Fase 1 (alle punten) of alleen voor de schuldenpagina (Fase 2).
