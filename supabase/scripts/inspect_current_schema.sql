-- Alleen-lezen inspectie: echte huidige staat van de database.
-- Uitvoeren in Supabase SQL Editor. Geen wijzigingen, alleen SELECT.

-- =============================================================================
-- 1. information_schema.tables (public schema)
-- =============================================================================
SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_schema, table_name;

-- =============================================================================
-- 2. information_schema.columns (public schema: kolom, type, nullable, default)
-- =============================================================================
SELECT
  table_schema,
  table_name,
  column_name,
  ordinal_position,
  data_type,
  character_maximum_length,
  numeric_precision,
  numeric_scale,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_schema, table_name, ordinal_position;

-- =============================================================================
-- 3. pg_policies (RLS-policies per tabel)
-- =============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text    AS using_expression,
  with_check::text AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================================================
-- 4. pg_proc (functies in public schema)
-- =============================================================================
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS result_type,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- =============================================================================
-- 5. pg_views (views in public schema)
-- =============================================================================
SELECT
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;
