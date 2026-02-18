# DataDenkt Systeem — Deploy op Railway

## Wat er mis kan gaan (en hoe je het oplost)

### 1. Environment variables niet gezet
Railway heeft **geen** toegang tot je `.env.local`. Alle variabelen moet je in het Railway-dashboard zetten: **Project → Variables**.

**Verplicht voor het systeem:**

| Variable | Beschrijving | Voorbeeld |
|----------|--------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJ...` of jouw key |
| `OPENAI_API_KEY` | OpenAI API key (voor `/api/ai`) | `sk-proj-...` |
| `DATABASE_URL` | PostgreSQL connection string (voor Prisma) | Zie hieronder |
| `APP_BASE_URL` | **Publieke URL van het systeem op Railway** (geen localhost) | `https://jouw-service.up.railway.app` |

**Belangrijk:** `APP_BASE_URL` moet de echte Railway-URL zijn (bijv. na eerste deploy). Zonder dit faalt `/api/ingest` en de n8n-callback.

**Optioneel (voor admin + n8n-flows):**

| Variable | Wanneer nodig |
|----------|----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Admin-pagina (gebruikerslijst) |
| `N8N_INGEST_WEBHOOK_URL` | Ingest-flow (n8n) |
| `N8N_CALLBACK_SECRET` | Callback van n8n naar je app |
| `NEXT_PUBLIC_N8N_AI_HUB_WEBHOOK` | Daynote/AI Hub in dashboard |
| `NEXT_PUBLIC_N8N_FINANCE_NEWS_WEBHOOK` | Financiën-nieuws |
| `NEXT_PUBLIC_N8N_FINANCE_CHAT_WEBHOOK` | Financiën-chat |

---

### 2. Geen database (DATABASE_URL)
Het systeem gebruikt **Prisma + PostgreSQL** voor o.a. taken, ingest-jobs en n8n-callbacks. Zonder `DATABASE_URL` krijg je runtime errors op:

- `/api/tasks`
- `/api/ingest`
- `/api/n8n/callback`
- `/api/jobs/[jobId]`

**Oplossing:**  
In Railway: **New → Database → PostgreSQL**. Railway zet dan automatisch `DATABASE_URL`. Koppel die database aan hetzelfde project als je service.

Daarna migraties draaien (lokaal kan met dezelfde URL, of via Railway CLI):

```bash
npx prisma migrate deploy
```

Of voeg een **release command** toe in Railway (Project → Settings → Build → Release Command):  
`npx prisma migrate deploy`

---

### 3. APP_BASE_URL verkeerd
Als `APP_BASE_URL` nog op `https://jouw-domein.nl` of `http://localhost:3001` staat, kunnen n8n-callbacks het systeem niet bereiken en faalt de ingest-flow.

Zet `APP_BASE_URL` in Railway Variables op de echte URL, bijvoorbeeld:  
`https://<jouw-service>.up.railway.app` (zonder trailing slash).

---

### 4. Port
Next.js luistert in productie op `process.env.PORT`. Railway zet `PORT` automatisch; daar hoef je niets voor te doen.

---

### 5. Build
- **Build command:** `npm run build` (nu: `prisma generate && next build`).
- **Start command:** `npm start` (of leeg laten; default is `npm start`).

---

## Checklist vóór deploy

- [ ] Railway project aangemaakt, repo gekoppeld (of Docker/Nixpacks).
- [ ] PostgreSQL database toegevoegd en gekoppeld → `DATABASE_URL` staat op de service.
- [ ] Variables gezet: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`, `APP_BASE_URL`.
- [ ] Na eerste deploy: `APP_BASE_URL` gezet op de echte Railway-URL.
- [ ] Optioneel: Release command `npx prisma migrate deploy` ingesteld.
- [ ] Migraties eenmalig gedraaid (`prisma migrate deploy`) als je dat niet via release command doet.

Daarna zou het DataDenkt Systeem online draaien en klaar zijn voor gebruik (inclusief `/api/ai` en taken).
