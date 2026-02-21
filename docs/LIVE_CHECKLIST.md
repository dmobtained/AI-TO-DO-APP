# Live checklist — Railway + Supabase

Volg deze stappen **in volgorde**. Daarna werkt de app op je live URL (inloggen, taken opslaan, data blijft bewaard).

---

## Deel 1: Railway

1. **Project koppelen**
   - Ga naar [railway.app](https://railway.app) en maak een project aan (of open bestaand).
   - Koppel je GitHub-repo: **New → GitHub Repo** en kies `AI-TO-DO-APP` (of jouw repo-naam).

2. **Database toevoegen (als je die nog niet hebt)**
   - In het project: **New → Database → PostgreSQL**.
   - Railway zet automatisch de variable `DATABASE_URL` op je service. Zorg dat de service en de database in hetzelfde project zitten (linked).

3. **Variables instellen**
   - Ga naar je **service** (de Next.js app) → tab **Variables**.
   - Voeg deze variabelen toe (vervang de voorbeelden door je echte waarden):

   | Variable | Waarde | Waar te vinden |
   |----------|--------|-----------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Dashboard → Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (lang token) | Supabase Dashboard → Project Settings → API → anon public |
   | `OPENAI_API_KEY` | `sk-proj-...` | OpenAI account / API keys |
   | `APP_BASE_URL` | Je live URL (zie stap 4) | Na eerste deploy, bijv. `https://ai-to-do-app-production.up.railway.app` |

   **Optioneel** (voor admin en extra functies):

   | Variable | Wanneer |
   |----------|---------|
   | `SUPABASE_SERVICE_ROLE_KEY` | Admin-pagina, gebruikerslijst |
   | `N8N_AI_HUB_WEBHOOK` | Knop "Genereer Dagnotitie" op dashboard |

4. **Eerste deploy**
   - Railway bouwt en deployt automatisch na push naar GitHub.
   - Na de deploy zie je een URL zoals: `https://ai-to-do-app-production.up.railway.app`.
   - **Zet `APP_BASE_URL`** in Variables op die URL (zonder slash aan het eind).

5. **Build- en startcommando’s (meestal al goed)**
   - **Build command:** `npm run build`
   - **Start command:** `npm start`
   - **Release command** (optioneel): `npx prisma migrate deploy` (als je Prisma-migraties wilt draaien bij elke deploy).

---

## Deel 2: Supabase

1. **Project en API-gegevens**
   - Ga naar [supabase.com](https://supabase.com) → jouw project.
   - **Project Settings** (tandwiel) → **API**:
     - **Project URL** → gebruik je voor `NEXT_PUBLIC_SUPABASE_URL` (al in Railway gezet).
     - **anon public** key → gebruik je voor `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

2. **Auth-URL’s voor live (belangrijk voor inloggen en opslaan)**
   - Ga naar **Authentication** in het linkermenu.
   - Scroll naar **Configuration** → klik **URL Configuration**.
   - **Site URL:** zet op je **live Railway-URL**, bijv.  
     `https://ai-to-do-app-production.up.railway.app`  
     (geen slash aan het eind.)
   - **Redirect URLs:** voeg dezelfde URL toe. Bijvoorbeeld:
     - `https://ai-to-do-app-production.up.railway.app`
     - `https://ai-to-do-app-production.up.railway.app/**`
   - Klik **Save changes**.

   Zonder deze stappen worden er geen sessie-cookies voor je live domein gezet → inloggen lijkt te werken maar data slaat niet op of verdwijnt na refresh.

3. **Database / tabellen**
   - De app gebruikt tabellen zoals `tasks`, `profiles`, `finance_entries`, `meeting_notes`, `leads`, enz.
   - Die horen via de migraties in `supabase/migrations/` te bestaan. Voer die migraties uit in Supabase (SQL Editor of `supabase db push` als je Supabase CLI gebruikt).

---

## Na het instellen

- **Live URL:** open je Railway-URL in de browser (HTTPS).
- **Inloggen:** log in met een bestaande Supabase-gebruiker (Authentication → Users in Supabase als je die daar aanmaakt).
- **Test:** voeg een taak toe op de takenpagina, ververs de pagina → de taak moet blijven staan.

Als iets niet werkt:
- Controleer in Railway of alle Variables kloppen en of er geen typefouten in de URL/key staan.
- Controleer in Supabase of **URL Configuration** exact je Railway-URL gebruikt (Site URL + Redirect URLs).
- Laat gebruikers na een wijziging daar **opnieuw inloggen** op de live URL.
