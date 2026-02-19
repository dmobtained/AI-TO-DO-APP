# STAP 6 — Output: Audit + RBAC verificatie

## 1. Database check SQL

De queries staan in **`supabase/DB_CHECK_activity_log_rbac.sql`**. Plak die in Supabase SQL Editor en voer uit. Ze controleren:

1. Bestaat `public.activity_log`?
2. RLS aan op `activity_log`?
3. Policies op `activity_log`?
4. Bestaat `public.profiles`?
5. RLS aan op `profiles`?
6. Policies op `profiles`?
7. Bestaat `is_admin_user()`?
8. Definitie van `is_admin_user()`?
9. Tabellen in policies (`activity_log` vs `activity_logs`)?

---

## 2. Code scan overzicht

Zie **`docs/AUDIT_RBAC_CODE_SCAN.md`**.

- **activity_logs**: nergens gebruikt.
- **activity_log**: gebruikt in admin/page.tsx (select), api/audit/route.ts (insert), api/modules/[id]/route.ts (insert). Geen `activity_logs`.
- **is_admin_user**: alleen in SQL (policies).
- **profiles**: in auth, dashboard-auth, AuthProvider, api/admin/users, api/modules. Service role alleen in admin/users en modules voor admin-only endpoints (users lijst, role wijzigen, modules beheer).

---

## 3. Wat is aangepast

### STAP 3 — Hard fixes

**A) activity_logs**  
- Niet gebruikt; geen wijziging.

**B) is_admin_user()**  
- Bestaat in migraties; checkt `role = 'ADMIN'` (profiles gebruikt 'ADMIN'/'USER'). Geen wijziging in code; fix-migratie hercreëert de functie.

**C) Policies**  
- Nieuwe migratie **`supabase/migrations/20250219100000_activity_log_fix_and_trigger.sql`**:
  - Zet oude `activity_log`-schema (user_id) om naar actor_user_id + actor_email + entity_type + entity_id + metadata.
  - Verwijdert oude policies "Users can read own activity_log" en "Users can insert own activity_log".
  - Hercreëert `is_admin_user()` (role = 'ADMIN').
  - Hercreëert policies `activity_log_insert_own` en `activity_log_select` (alleen RLS + auth.uid(), geen service role).

**D) handle_new_user()**  
- Toegevoegd in dezelfde migratie: trigger op `auth.users` na INSERT → insert in `public.profiles` (id, role, full_name). Role uit metadata of 'USER'; alleen 'ADMIN' als metadata.role = 'ADMIN'.

### API route audit (STAP 4)

- **app/api/audit/route.ts**:
  - Gebruikt `createClient` uit `@/lib/supabase/server` (server anon client).
  - User via `supabase.auth.getUser()`.
  - `actor_user_id` altijd `user.id` (nooit uit body).
  - Insert in `public.activity_log` met actor_user_id, actor_email, action, entity_type, entity_id, metadata.
  - Geen wijziging nodig.

### Modules route (extra fix)

- **app/api/modules/[id]/route.ts**:
  - `logActivity` schreef eerder `{ user_id, action }` (verkeerde kolommen).
  - Aangepast naar: `actor_user_id`, `actor_email`, `action`, `entity_type: null`, `entity_id: null`, `metadata: {}`.
  - Aanroep: `logActivity(supabase, user.id, user.email ?? null, action)`.

### Admin page (STAP 5)

- **app/(app)/admin/page.tsx**:
  - Gebruikt `.from('activity_log')`, `.order('created_at', { ascending: false })`, `.limit(200)`.
  - Gebruikt `getSupabaseClient()` (normale client, RLS).
  - Geen service role. Geen wijziging.

---

## 4. Definitieve bevestiging

| Check | Status |
|-------|--------|
| **Slechts 1 audit-tabel** | Er is alleen **`activity_log`**. `activity_logs` komt nergens voor. |
| **RBAC** | Admin wordt bepaald via `profiles.role = 'ADMIN'`. `is_admin_user()` gebruikt dat in RLS. Admin layout redirectt niet-admins naar /dashboard. Admin page laadt alleen voor role === 'ADMIN'. |
| **Geen service role misbruik voor audit** | Geen enkele insert/select op `activity_log` gebruikt service role. Alleen anon/server client (createClient of getSupabaseClient). Service role wordt alleen gebruikt voor admin/users (lijst users, role wijzigen) en modules (beheer). |
| **RLS correct** | `activity_log`: INSERT alleen eigen rows (actor_user_id = auth.uid()). SELECT: eigen rows of is_admin_user(). Geen policies die service role nodig hebben. |

**Bestanden voor jou:**

- **Database checks uitvoeren**: `supabase/DB_CHECK_activity_log_rbac.sql`
- **Schema + policies + trigger bijwerken**: `supabase/migrations/20250219100000_activity_log_fix_and_trigger.sql` (lokaal uitvoeren of in SQL Editor plakken)
