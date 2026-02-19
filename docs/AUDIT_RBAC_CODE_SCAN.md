# STAP 2 — Codebase validatie overzicht

## "activity_logs"
- **Geen voorkomens.** Er wordt nergens `activity_logs` gebruikt.

## "activity_log"
| File | Gebruik |
|------|--------|
| `supabase/activity_log_manual.sql` | CREATE TABLE, indexes, policies op `public.activity_log` |
| `supabase/migrations/20250219000000_activity_log.sql` | Idem |
| `supabase/migrations/20250216000000_schema_updates.sql` | CREATE TABLE `public.activity_log` met **oude schema** (user_id, action, created_at) |
| `app/(app)/admin/page.tsx` | `supabase.from('activity_log').select(...).order('created_at', { ascending: false }).limit(200)` — normale client, RLS |
| `app/api/audit/route.ts` | `supabase.from('activity_log').insert({ actor_user_id: user.id, actor_email, action, entity_type, entity_id, metadata })` — createClient (server anon), actor_user_id uit user.id |
| `app/api/modules/[id]/route.ts` | `supabase.from('activity_log').insert({ user_id: userId, action })` — **FOUT**: gebruikt `user_id` en geen actor_email/entity_type/entity_id/metadata; tabel verwacht `actor_user_id` in nieuwe schema |

## "is_admin_user"
- Alleen in **SQL**: `supabase/migrations/20250219000000_activity_log.sql`, `supabase/activity_log_manual.sql` — policy `activity_log_select` gebruikt `public.is_admin_user()`.
- **Niet** in TypeScript/API code (alleen in DB).

## "profiles"
| File | Gebruik |
|------|--------|
| `lib/auth.ts` | `supabase.from('profiles').select('role').eq('id', userId).maybeSingle()` — server createClient |
| `lib/dashboard-auth.ts` | `supabase.from('profiles').select('role, email, full_name').eq('id', user.id).maybeSingle()`; daarna `supabaseAdmin ?? supabase` voor modules |
| `context/AuthProvider.tsx` | `supabase.from('profiles').select('role').eq('id', userId).maybeSingle()` — client |
| `app/api/modules/[id]/route.ts` | `supabaseAdmin.from('profiles').select('role').eq('id', user.id)` — **service role** (admin check) |
| `app/api/modules/route.ts` | `supabaseAdmin.from('profiles').select('role')` — **service role** |
| `app/api/admin/users/[id]/route.ts` | `supabase.from('profiles')` (createClient) voor eigen role; `supabaseAdmin` voor update — **service role** voor PATCH |
| `app/api/admin/users/route.ts` | `supabaseAdmin.from('profiles').select('role')` en `supabaseAdmin.from('profiles').select('id, role')` — **service role** (lijst users + role) |
| `supabase/migrations/20250218000000_profiles_full_name.sql` | ALTER profiles full_name |
| `supabase/migrations/20250216000000_schema_updates.sql` | ALTER profiles role CHECK ('ADMIN','USER') |
| `supabase/migrations/20250219000000_activity_log.sql` | `is_admin_user()` leest `public.profiles` (role = 'ADMIN') |

## Exacte Supabase .from("...") calls
- `from('activity_log')`: admin/page.tsx (select), api/audit/route.ts (insert), api/modules/[id]/route.ts (insert met verkeerde kolommen).
- `from('profiles')`: lib/auth.ts, lib/dashboard-auth.ts, AuthProvider, api/modules/[id], api/modules/route, api/admin/users/[id], api/admin/users/route.

## API route naar activity_log
- **app/api/audit/route.ts**: schrijft naar `activity_log` met actor_user_id = user.id (correct).
- Geen route schrijft naar `activity_logs`.

## Service role gebruik
- **lib/supabaseAdmin.ts**: export supabaseAdmin (service role key).
- **lib/dashboard-auth.ts**: `supabaseAdmin ?? supabase` alleen voor modules-tabel (niet voor activity_log).
- **app/api/admin/users/route.ts**: supabaseAdmin voor auth.admin.listUsers en profiles (admin-only endpoint).
- **app/api/admin/users/[id]/route.ts**: supabaseAdmin voor PATCH profiles (role wijzigen).
- **app/api/modules/route.ts**: supabaseAdmin voor profiles + modules.
- **app/api/modules/[id]/route.ts**: supabaseAdmin voor profiles check + modules update; **activity_log insert gebruikt createClient (anon)**.
