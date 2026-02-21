# Wat is handig om te bouwen met n8n voor deze app

Overzicht van n8n-workflows die goed aansluiten op de bestaande app: wat er al wordt aangeroepen, wat nog mock is, en wat extra waarde geeft.

---

## 1. Al in gebruik (webhooks bestaan of worden verwacht)

| Flow | Env-variabele | Wat de app doet |
|------|----------------|-----------------|
| **AI Hub / Dagnotitie** | `N8N_AI_HUB_WEBHOOK` | Dashboard: "Genereer Dagnotitie" → POST `/api/ai/daynote` → server roept jouw webhook aan met `{ type: 'daynote', tasks: [{ title, status, date }] }`. Verwacht: `{ note: string }` (min. 20 tekens). Wordt in `ai_notes` opgeslagen. |
| **E-mail AI-antwoord** | `NEXT_PUBLIC_N8N_AI_REPLY_WEBHOOK` of `N8N_AI_HUB_WEBHOOK` | E-mailpagina: AI-antwoord op geselecteerde mail. App stuurt mail-inhoud naar webhook; jij retourneert gegenereerde reply-tekst. |
| **Ingest** | `N8N_INGEST_WEBHOOK_URL` + `N8N_CALLBACK_SECRET` | `/api/ingest` stuurt o.a. `jobId`, `callbackUrl`, `callbackSecret` naar n8n; n8n werkt af en roept callback aan. (Prisma/PostgreSQL-kant; als je Supabase-only bent mogelijk niet actief.) |
| **Financiën-nieuws** | `NEXT_PUBLIC_N8N_FINANCE_NEWS_WEBHOOK` | Bankzaldo-sectie: knop om nieuws te laden. App doet GET (of POST) naar webhook; jij retourneert tekst voor in het paneel. |
| **Financiën-chat** | `NEXT_PUBLIC_N8N_FINANCE_CHAT_WEBHOOK` | Zelfde sectie: chatbot-vraag. App stuurt vraag; jij retourneert antwoord. |

**Handig om te bouwen:** Zorg dat de **AI Hub**-webhook (`N8N_AI_HUB_WEBHOOK`) in ieder geval de `daynote`-payload afhandelt: ontvang `type: 'daynote'` + `tasks`, stuur naar OpenAI (of andere LLM), retourneer `{ note: "..." }`. Dan werkt "Genereer Dagnotitie" echt.

---

## 2. Nu nog mock/demo – ideaal voor n8n

### Vergaderingen: AI-samenvatting

- **Situatie:** Op `/vergaderingen` doet "AI samenvatten" een `setTimeout` met vaste demo-tekst; geen echte AI.
- **Handig in n8n:** Een webhook die vergadernotities (tekst) ontvangt, een LLM een samenvatting laat maken (kernpunten, actiepunten), en die tekst teruggeeft.
- **In de app aanpassen:** Vergaderingen-pagina: bij "AI samenvatten" POST naar bijv. `N8N_AI_HUB_WEBHOOK` of een eigen `NEXT_PUBLIC_N8N_MEETING_SUMMARY_WEBHOOK` met body `{ type: 'meeting_summary', text: notities }`. Response `{ summary: string }`. Vervang de `setTimeout` door deze fetch.

### Schulden: AI-optimalisatie (optioneel uitbesteden aan n8n)

- **Situatie:** De schuldenpagina roept nu **eigen API** aan: `/api/webhook/ai-hub` met `type: 'debt_analysis'`. Die route doet zelf een simpele berekening (avalanche, cashflow) en retourneert een vast format; geen echte LLM.
- **Handig in n8n:** Een flow die dezelfde payload ontvangt (debts, income, fixed_expenses, variable_expenses), een LLM een advies laat genereren (taal, uitleg, risico’s), en het antwoord in het bestaande format teruggeeft (actions, extraPerMonth, priorityDebt, newEndDate, riskAnalysis). App hoeft dan alleen de ai-hub-URL naar n8n te laten wijzen en de response te tonen.
- **Voordeel:** Rijkere, persoonlijke teksten en evt. betere schattingen zonder app-code aan te passen.

---

## 3. Extra ideeën die goed passen

| Flow | Doel | Input (voorbeeld) | Output (voorbeeld) |
|------|------|-------------------|--------------------|
| **Notities-samenvatting** | Lange notitie inkorten of kernpunten | `{ type: 'note_summary', text: "..." }` | `{ summary: "..." }` |
| **Taak-suggesties** | Op basis van open taken + datum een korte “focus vandaag”-tekst | Zelfde als daynote of `{ type: 'focus_suggestions', tasks: [...] }` | `{ suggestions: string }` |
| **Wekelijkse digest** | Cron: open taken + laatste notities + korte samenvatting | Scheduled trigger + ophalen data via Supabase/API | E-mail of opslaan in app (als je een “digest”-tabel toevoegt) |
| **Herinnering open taken** | Cron: gebruikers met veel open/overdue taken | Supabase-query, per user | E-mail of in-app notificatie (als je die bouwt) |
| **Valuta/uitleg** | Korte uitleg bij een koers of pair | `{ type: 'currency_explain', from, to, rate }` | `{ explanation: string }` |

Deze zijn niet verplicht; ze sluiten wel aan bij bestaande schermen (notities, taken, valuta).

---

## 4. Aanbevolen volgorde

1. **AI Hub daynote** – Zorg dat de webhook op `N8N_AI_HUB_WEBHOOK` `type: 'daynote'` afhandelt en `{ note }` teruggeeft. Dan werkt de bestaande dagnotitie-knop.
2. **Vergaderingen-samenvatting** – Nieuwe webhook of type in bestaande hub; app aanpassen zodat "AI samenvatten" die aanroept i.p.v. de demo.
3. **E-mail AI-antwoord** – Als je die URL al gebruikt: flow die mail-body ontvangt en een reply genereert.
4. **Debt analysis (optioneel)** – Bestaande payload naar n8n sturen en daar LLM gebruiken; app blijft hetzelfde format tonen.
5. **Financiën-nieuws / -chat** – Als de sectie in de app wordt gebruikt: twee simpele flows (nieuws ophalen, vraag→antwoord).

Als je wilt, kan in de app concreet worden uitgewerkt: welke env-variabelen, welke request/response-formats en waar de fetch in de code moet komen (bijv. vergaderingen-pagina).
