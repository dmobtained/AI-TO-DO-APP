# DataDenkt Systeem — Deploy op Railway

## Is het systeem klaar voor Railway?

Ja. Het project is gebouwd voor deploy op Railway:

- **Build:** `npm run build` (Prisma generate + Next.js build)
- **Start:** `npm start` → `next start` (luistert op `PORT` die Railway zet)
- **Geen Docker nodig:** Railway gebruikt Nixpacks/Node automatisch
- **Secrets:** Alle gevoelige waarden via Railway Variables (nooit in repo)

Zet de onderstaande variabelen in Railway en voer eventueel Prisma-migraties uit. Daarna is de app live.

---

## Wat er mis kan gaan (en hoe je het oplost)

### 1. Environment variables niet gezet
Railway heeft **geen** toegang tot je `.env.local`. Alle variabelen moet je in het Railway-dashboard zetten: **Project → Variables**.

**Verplicht voor het systeem:**

| Variable | Beschrijving | Voorbeeld |
|----------|--------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJ...` of jouw key |
| `OPENAI_API_KEY` | OpenAI API key (voor `/api/ai`) | `sk-proj-...` |
| `DATABASE_URL` | PostgreSQL connection string (voor Prisma) | Wordt door Railway gezet bij “Add PostgreSQL” |
| `APP_BASE_URL` | **Publieke URL van het systeem op Railway** (geen localhost) | `https://jouw-service.up.railway.app` |

**Belangrijk:** `APP_BASE_URL` moet de echte Railway-URL zijn (bijv. na eerste deploy). Zonder dit faalt `/api/ingest` en de n8n-callback.

**Optioneel (voor admin + n8n-flows):**

| Variable | Wanneer nodig |
|----------|----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Admin-pagina (gebruikerslijst) |
| `N8N_AI_HUB_WEBHOOK` | Dagnotitie (“Genereer Dagnotitie” in dashboard) – aanbevolen (server-only) |
| `NEXT_PUBLIC_N8N_AI_HUB_WEBHOOK` | Zelfde als hierboven, indien je de URL ook in de browser wilt (meestal niet nodig) |
| `N8N_INGEST_WEBHOOK_URL` | Ingest-flow (n8n) |
| `N8N_CALLBACK_SECRET` | Callback van n8n naar je app |
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

### 5. Supabase Auth: Site URL en Redirect URLs (belangrijk voor live)
Als inloggen op Railway werkt maar **data slaat niet op** of de **pagina blijft eindeloos laden**, controleer in Supabase:

1. **Supabase Dashboard → Authentication → URL Configuration**
2. **Site URL:** zet op je live URL, bijv. `https://jouw-app.up.railway.app` (geen trailing slash).
3. **Redirect URLs:** voeg dezelfde URL toe (en eventueel `https://jouw-app.up.railway.app/**`). Zonder deze URL zet Supabase geen sessie-cookies voor je Railway-domein, waardoor de app geen echte sessie heeft en opslaan/RLS faalt of de server geen user ziet.

Na aanpassing: gebruikers opnieuw laten inloggen op de live URL.

---

### 6. Build
- **Build command:** `npm run build` (nu: `prisma generate && next build`).
- **Start command:** `npm start` (of leeg laten; default is `npm start`).

---

## Checklist vóór deploy

- [ ] Railway project aangemaakt, GitHub/repo gekoppeld.
- [ ] **PostgreSQL:** New → Database → PostgreSQL; koppel aan je service → `DATABASE_URL` is automatisch gezet.
- [ ] **Variables** in Railway (Project → Variables):
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `OPENAI_API_KEY`
  - [ ] `DATABASE_URL` (vaak automatisch na toevoegen database)
  - [ ] `APP_BASE_URL` → na eerste deploy invullen met je echte URL (bijv. `https://xxx.up.railway.app`)
  - [ ] (Optioneel) `N8N_AI_HUB_WEBHOOK` voor dagnotitie
  - [ ] (Optioneel) `SUPABASE_SERVICE_ROLE_KEY` voor admin-gebruikerslijst
- [ ] **Release command** (aanbevolen): Project → Settings → Build → Release Command: `npx prisma migrate deploy`
  - Of handmatig eenmalig: `npx prisma migrate deploy` (met dezelfde `DATABASE_URL`).
- [ ] Na eerste deploy: controleer of `APP_BASE_URL` klopt met de gegenereerde Railway-URL.

Daarna draait het DataDenkt Systeem online (login, dashboard, taken, dagnotitie, `/api/ai`).
