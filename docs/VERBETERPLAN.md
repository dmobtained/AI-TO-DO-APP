# Verbeterplan – Alles 100% goed maken

Dit document bundelt alle verbeterpunten die uit de code-analyse zijn gekomen. Per onderdeel staat wat er nu mis is en wat je kunt doen. Je kunt kiezen welke punten je als eerste wilt aanpakken.

---

## Prioriteit 1: Bugs & betrouwbaarheid (eerst doen)

| # | Waar | Probleem | Voorstel |
|---|------|----------|----------|
| 1.1 | `dashboard/page.tsx` | Bij het laden van taken/financiën worden Supabase-fouten genegeerd; je ziet alleen lege data. | Controleer `tasksRes.error` en `financeRes.error`; toon een toast of melding bij fout en eventueel een "Opnieuw proberen"-knop. |
| 1.2 | `dashboard/page.tsx` | Weer-ophalen: bij fout wordt stil `setWeather({})` gedaan, geen feedback. | In de catch: toast "Weer niet beschikbaar" of kleine offline-melding. |
| 1.3 | `notities/page.tsx` | Bij mislukte delete sluit de dialog toch en zie je geen fout. | Alleen dialog sluiten bij succes; bij `!res.ok` toast tonen en dialog open houden. |
| 1.4 | `notities/page.tsx` | Bij mislukte pin/unpin geen feedback; `data.note` kan undefined zijn. | Toast bij fout + pin-state terugzetten; alleen updaten als `data?.note` bestaat. |
| 1.5 | `admin/page.tsx` | Bij mislukte rolwijziging geen melding. | Toast "Rol wijzigen mislukt" (en eventueel state terugzetten). |
| 1.6 | `lib/supabase/server.ts` | Bij ontbrekende Supabase env wordt placeholder gebruikt; fouten zijn dan onduidelijk. | Bij placeholder/missing env: duidelijke fout gooien of loggen zodat config direct zichtbaar is. |
| 1.7 | `valuta/page.tsx` | Bij API-fout worden stilletjes mock-koersen gebruikt. | Kleine melding tonen: "Offline / cache-koersen" zodat de gebruiker weet dat data verouderd kan zijn. |

---

## Prioriteit 2: UX & consistentie

| # | Waar | Probleem | Voorstel |
|---|------|----------|----------|
| 2.1 | Meerdere pagina’s | Mix van design tokens (`text-textPrimary`, `border-border`) en hardcoded kleuren (`#2563eb`, `slate-*`). | Overal dezelfde tokens gebruiken; hex/slate vervangen door tokens (o.a. globals.css, instellingen toggle, taken, notities, Table, ConfirmDeleteDialog, mail). |
| 2.2 | `global-error.tsx` | Inline hex-kleuren in plaats van theme. | Theme-classes of CSS-variabelen gebruiken zodat de foutpagina bij de rest van de app past. |
| 2.3 | Taken-formulier | Geen duidelijke validatie (verplicht veld, datum in verleden). | Korte validatiemeldingen bij velden + eventueel `aria-invalid` / `aria-describedby`. |
| 2.4 | Valuta | Alleen loading; geen expliciete "error" state. | Zie 1.7: duidelijke "offline/cache"-melding. |
| 2.5 | Pagina’s zonder PageContainer | Dashboard, valuta, admin, financiën (bank/belasting/lasten), email gebruiken eigen `max-w-*` divs. | Overal `PageContainer` gebruiken voor dezelfde breedte en padding. |

---

## Prioriteit 3: Toegankelijkheid (a11y)

| # | Waar | Probleem | Voorstel |
|---|------|----------|----------|
| 3.1 | Formulieren (agenda, valuta, taken, etc.) | Labels niet gekoppeld aan inputs (`htmlFor` + `id` ontbreekt). | Bij elk veld: unieke `id` op het input en `htmlFor={id}` op het label. |
| 3.2 | Agenda: verwijderknop | ~28×28px, onder de 44px-richtlijn voor touch. | Groter maken: min. 44×44px (bijv. `min-w-11 min-h-11`). |
| 3.3 | Dashboard / Taken: "Afvinken" | Checkbox/knoppen ~20×20px. | Grotere klik-/tapzone (bijv. min 44×44px of extra padding). |
| 3.4 | Instellingen: switch | Heeft `role="switch"` en `aria-checked`; moet met toetsenbord te bedienen zijn. | Focusable maken en met Enter/Space laten toggleen, of echte checkbox met styling. |
| 3.5 | Tabellen | Geen `scope` op `<th>` of `caption`/`aria-label`. | Waar nuttig: `<caption>` of `aria-label` op tabel; `scope="col"` (of row) op headers. |

---

## Prioriteit 4: Performance

| # | Waar | Probleem | Voorstel |
|---|------|----------|----------|
| 4.1 | Dashboard | Grote pagina, veel state; lijsten kunnen vaak opnieuw renderen. | Zware lijst-items in `React.memo`; eventueel secties splitsen op data. |
| 4.2 | Admin: activiteiten | Tot 200 rijen in één keer, geen virtualisatie. | Virtuele lijst (bijv. `react-window` of `@tanstack/react-virtual`) voor de activiteitentabel. |
| 4.3 | Agenda: import-preview | Alle rijen gerenderd in scroll-gebied. | Bij veel rijen: virtualisatie of paginatie. |
| 4.4 | Notities | Bij heel veel notities alles in één lijst. | Bij groei: virtualisatie of paginatie. |
| 4.5 | `lib/currency.ts` | Lange URL met alle valuta’s per request. | Vaste set “veelgebruikte” valuta’s voor de API of server-side proxy. |

---

## Prioriteit 5: Security

| # | Waar | Probleem | Voorstel |
|---|------|----------|----------|
| 5.1 | Email / n8n webhook | URL hardcoded in client (`https://datadenkt.app.n8n.cloud/...`). | Verplaatsen naar env (bijv. `NEXT_PUBLIC_N8N_AI_REPLY_WEBHOOK`) of via API-route met server-only env. |
| 5.2 | Layout: Supabase-script | `dangerouslySetInnerHTML` voor url/key. | Waar mogelijk: data in een data-attribuut zetten en in client JS uitlezen; geen ruwe HTML in script. |
| 5.3 | Middleware: admin | Alleen `user_metadata.role`; die is client-side aanpasbaar. | Documenteren dat server/profile leidend is; alle admin-API’s op profile/server-sessie valideren. |
| 5.4 | User content | Geen zichtbare sanitization; bij `dangerouslySetInnerHTML` later risico op XSS. | User content alleen als tekst tonen (of met sanitizer); geen `dangerouslySetInnerHTML` op user data zonder sanitization. |

---

## Prioriteit 6: Codekwaliteit

| # | Waar | Probleem | Voorstel |
|---|------|----------|----------|
| 6.1 | PageContainer | Niet overal gebruikt (zie 2.5). | Standaardiseren op PageContainer voor alle app-pagina’s. |
| 6.2 | Email-pagina’s | Zelfde logica in dashboard/email en mail (state, handleGenerateReply, layout). | Gedeelde hook (bijv. `useMailInbox`) en/of component `MailInbox`. |
| 6.3 | Magic numbers | Bijv. `TIMEOUT_MS 15000` op dashboard. | Named constant (bijv. `DASHBOARD_FETCH_TIMEOUT_MS`) in bestand of gedeelde config. |
| 6.4 | Agenda: import | Lange foutstring inline. | Constante of i18n-key. |
| 6.5 | Vergaderingen | "AI"-samenvatting is fake (setTimeout + vaste tekst). | Echte AI-aanroep of duidelijke "Demo"-label; geen misleidende "AI"-tekst. |
| 6.6 | Financiën-overview | Bij fout alleen `setEntries([])`, geen toast. | Foutmelding (toast of inline) en eventueel vorige data laten staan. |

---

## Prioriteit 7: Mobile

| # | Waar | Probleem | Voorstel |
|---|------|----------|----------|
| 7.1 | Agenda: verwijderknop | Zie 3.2: te kleine touch target. | 44×44px of groter. |
| 7.2 | Dashboard / Taken: afvinken | Zie 3.3. | Grotere tap-target. |
| 7.3 | Email: sidebar | Vaste breedte; op kleine schermen krap. | Op smal scherm: drawer of full-width lijst; overflow testen. |
| 7.4 | Tabellen | Geen `-webkit-overflow-scrolling: touch` waar nodig. | Toevoegen voor soepel scrollen op iOS. |
| 7.5 | Admin: activiteitentabel | Op mobiel horizontaal scrollen lastig. | `overflow-x-auto` op wrapper; eventueel op small screens card-layout. |

---

## Prioriteit 8: Database & API

| # | Waar | Probleem | Voorstel |
|---|------|----------|----------|
| 8.1 | Notes API | Aparte fetches voor note en profile. | Waar mogelijk: één flow (RPC of query met join) om round-trips te verminderen. |
| 8.2 | Admin: users | Alle users + profiles in één keer. | Paginatie (perPage/offset) of duidelijke max (bijv. 1000). |
| 8.3 | Dashboard overview | Geen retry bij mislukte load. | "Opnieuw proberen"-knop of automatische retry met backoff. |
| 8.4 | Business, Taken, etc. | Na create/update/delete alleen refetch; geen optimistic update. | Waar logisch: direct state updaten en bij API-fout terugdraaien. |
| 8.5 | Supabase-tabellen | Geen indexes zichtbaar in app; veel op user_id, entry_date, created_at. | Indexes op die kolommen (en andere veelgebruikte filters) in migrations; documenteren in schema. |

---

## Aanbevolen volgorde

1. **Eerst (kort werk, groot effect)**  
   - 1.1 t/m 1.7 (foutafhandeling + valuta-melding)  
   - 3.2, 3.3 (grotere touch targets agenda + taken)  
   - 2.5 (PageContainer overal)

2. **Daarna**  
   - 2.1, 2.2 (design tokens overal)  
   - 3.1 (form labels koppelen)  
   - 5.1 (webhook naar env)

3. **Later (meer werk)**  
   - 4.2, 4.3, 4.4 (virtualisatie)  
   - 6.2 (mail-hook)  
   - 8.2, 8.4 (paginatie, optimistic updates)

Als je zegt welke prioriteit of welk nummer je eerst wilt doen, kan de volgende stap zijn: concrete code-aanpassingen per punt (bijv. alleen 1.1–1.5, of alleen "Prioriteit 1").
