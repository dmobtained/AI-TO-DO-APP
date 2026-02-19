-- ============================================================
-- STAP 1 — DATABASE VALIDATIE (plak in Supabase SQL Editor)
-- ============================================================

-- 1. Bestaat public.activity_log?
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'activity_log'
) AS activity_log_exists;

-- 2. Staat RLS aan op activity_log?
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'activity_log'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. Welke policies zitten op activity_log?
SELECT policyname, cmd, qual::text AS using_expr, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'activity_log';

-- 4. Bestaat public.profiles?
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'profiles'
) AS profiles_exists;

-- 5. Staat RLS aan op profiles?
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'profiles'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 6. Welke policies zitten op profiles?
SELECT policyname, cmd, qual::text AS using_expr, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 7. Bestaat functie is_admin_user()?
SELECT EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'is_admin_user'
) AS is_admin_user_exists;

-- 8. Wat zit er in is_admin_user() (definition tonen)?
SELECT pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname = 'is_admin_user'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 9. Welke tabellen worden in policies gebruikt (activity_log vs activity_logs)?
SELECT tablename FROM pg_policies WHERE schemaname = 'public' AND (tablename = 'activity_log' OR tablename = 'activity_logs');
