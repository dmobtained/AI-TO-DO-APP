# RBAC role casing — canonical 'admin' | 'user' (lowercase)

## 1) Repo scan (voor de wijzigingen)

Gezocht naar: `ADMIN`, `"ADMIN"`, `'ADMIN'`, `role === "ADMIN"`, `role === 'ADMIN'`, en `role === "admin"` / `'admin'`.

| File | Regel | Hit |
|------|--------|-----|
| supabase/migrations/20250219100000_activity_log_fix_and_trigger.sql | 30, 40, 68 | comment 'ADMIN', is_admin_user role = 'ADMIN', handle_new_user 'ADMIN'/'USER' |
| supabase/activity_log_manual.sql | 29, 39 | idem |
| supabase/migrations/20250219000000_activity_log.sql | 25, 35 | idem |
| app/api/modules/[id]/route.ts | 40 | profile?.role !== 'ADMIN' |
| app/(app)/dashboard/email/page.tsx | 109 | role !== 'ADMIN' |
| app/(app)/admin/page.tsx | 37, 77, 82, 87, 130 | role !== 'ADMIN', nextRole 'USER'/'ADMIN' |
| middleware.ts | 23 | toUpperCase() === 'ADMIN' |
| lib/auth.ts | 15, 25, 35 | comment, r === 'ADMIN', toUpperCase() === 'ADMIN' |
| context/AuthProvider.tsx | 7, 25, 48, 64, 95 | Role type, getRoleFromMetadata, fetchProfileRole, metaRole !== 'ADMIN' |
| lib/dashboard-auth.ts | 40, 54 | roleFromMeta, profile.role === 'ADMIN' |
| app/(app)/mail/page.tsx | 120 | role !== 'ADMIN' |
| app/(app)/dashboard/instellingen/page.tsx | 105, 108 | role === 'ADMIN' |
| app/api/modules/route.ts | 36–37, 56, 58 | getRole 'ADMIN'/'USER', roleFromProfile, isAdmin |
| app/api/admin/users/[id]/route.ts | 8, 25, 29 | PatchBody, isAdmin, body.role |
| app/api/admin/users/route.ts | 11, 22, 39, 43 | AdminUser role, isAdmin, profileById, role default |
| supabase/migrations/20250216000000_schema_updates.sql | 84 | DEFAULT 'USER' CHECK ('ADMIN','USER') — historisch, wordt overschreven door normalize_roles |
| components/admin/UserTable.tsx | 6, 16–17, 67 | AdminUser role, RoleBadge, button text |
| scripts/modules-developer-mode.sql | 46 | comment |

AppShell, sidebar-config, DashboardContext, DashboardShell gebruikten al `role === 'admin'`.

---

## 2) Nieuwe migratie

Bestand: **`supabase/migrations/20250219200000_normalize_roles.sql`**

```sql
-- Canonical role casing: 'admin' | 'user' (lowercase) everywhere.

-- 1) Update existing profile roles to lowercase
UPDATE public.profiles SET role = lower(role) WHERE role IS NOT NULL;

-- 2) Enforce check constraint (lowercase only)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user'));

-- 3) Default 'user'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

-- 4) is_admin_user() — canonical lowercase
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- 5) handle_new_user() — insert lowercase role, default 'user'; no email required (column optional)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r text;
BEGIN
  r := COALESCE(TRIM(LOWER(NEW.raw_user_meta_data->>'role')), '');
  r := CASE WHEN r = 'admin' THEN 'admin' ELSE 'user' END;
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    r,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$;

-- Trigger already exists from 20250219100000; just replace function above
-- RLS activity_log: SELECT uses is_admin_user() (now lowercase); INSERT unchanged.
```

---

## 3) Gewijzigde codebestanden (overzicht)

- **lib/auth.ts** — `getProfileRole`: return `'admin'|'user'`, normalisatie met `.toLowerCase().trim()`; `isAdmin`: metadata-check met `.toLowerCase().trim() === 'admin'`.
- **lib/dashboard-auth.ts** — `roleFromMeta` en profile-role check op lowercase `'admin'`.
- **context/AuthProvider.tsx** — `Role` type `'admin'|'user'|null`; `getRoleFromMetadata` en `fetchProfileRole` retourneren lowercase; alle vergelijkingen op `'admin'`/`'user'`.
- **app/(app)/admin/page.tsx** — Alle checks `role !== 'admin'`; `nextRole` `'admin'`|`'user'`.
- **app/api/admin/users/route.ts** — `AdminUser.role` `'admin'|'user'`; isAdmin en profileById op lowercase.
- **app/api/admin/users/[id]/route.ts** — `PatchBody.role` `'admin'|'user'`; isAdmin en body-role lowercase.
- **components/admin/UserTable.tsx** — `AdminUser.role` en `RoleBadge` `'admin'|'user'`; buttontekst "Naar user" / "Naar admin".
- **app/(app)/dashboard/instellingen/page.tsx** — `role === 'admin'`.
- **app/(app)/dashboard/email/page.tsx** — `role !== 'admin'`.
- **app/(app)/mail/page.tsx** — `role !== 'admin'`.
- **middleware.ts** — `isAdmin`: `.toLowerCase().trim() === 'admin'`.
- **app/api/modules/[id]/route.ts** — Profile-check `(profile?.role?.toLowerCase?.() ?? '') !== 'admin'`.
- **app/api/modules/route.ts** — `getRole` retourneert `'admin'|'user'`; roleFromProfile en isAdmin op lowercase.
- **supabase/activity_log_manual.sql** — `is_admin_user()` met `role = 'admin'`.
- **supabase/migrations/20250219000000_activity_log.sql** — Idem.
- **supabase/migrations/20250219100000_activity_log_fix_and_trigger.sql** — `is_admin_user()` met `role = 'admin'`; handle_new_user met lowercase `'admin'`/`'user'`.
- **scripts/modules-developer-mode.sql** — Alleen comment aangepast.

---

## 4) activity_log RLS

- **SELECT**: policy gebruikt `actor_user_id = auth.uid() OR public.is_admin_user()`. `is_admin_user()` gebruikt nu `role = 'admin'` (lowercase). Geen wijziging aan de policy zelf.
- **INSERT**: `actor_user_id = auth.uid()`. Ongewijzigd.

---

## 5) Bevestiging

- **Geen 'ADMIN'/'USER' meer in app-code (TS/TSX)**: alle role-checks en -types gebruiken `'admin'` of `'user'`.
- **SQL**: alleen in **`supabase/migrations/20250216000000_schema_updates.sql`** staat nog `DEFAULT 'USER'` en `CHECK (role IN ('ADMIN','USER'))`. Dat bestand is historisch; **`20250219200000_normalize_roles.sql`** zet bestaande data en constraint naar lowercase en default `'user'`, dus na het draaien van de migraties is de DB volledig lowercase.
- **Sidebar adminOnly**: blijft `role === 'admin'`.
- **Admin layout guard**: gebruikt `getDashboardAuth()`; `role` is daar `'admin'|'user'`; redirect bij `role !== 'admin'`.
- **Trigger handle_new_user()**: schrijft alleen lowercase `'admin'` of `'user'`; geen email verplicht; full_name optioneel via COALESCE.
