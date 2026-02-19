/**
 * Module Engine – Access control.
 * Single source of truth for roles: public.profiles.role.
 * Server-only: use from API routes or server components.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type AppRole = 'admin' | 'user'

/**
 * Returns true if the given user ID has role 'admin' in public.profiles.
 * Uses supabase (anon key) so RLS applies; we need to read profiles.
 */
export async function isAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  const role = (data as { role?: string } | null)?.role
  return typeof role === 'string' && role.toLowerCase().trim() === 'admin'
}

/**
 * Returns true if the module is locked (read-only for non-admins).
 */
export async function isLocked(
  supabase: SupabaseClient,
  slug: string
): Promise<boolean> {
  const { data } = await supabase
    .from('module_locks')
    .select('locked')
    .eq('slug', slug)
    .maybeSingle()
  return (data as { locked?: boolean } | null)?.locked === true
}

/**
 * User can write (create/update/delete) in this module iff:
 * - they are admin, OR
 * - the module is not locked.
 */
export async function canWrite(
  supabase: SupabaseClient,
  slug: string,
  userId: string
): Promise<boolean> {
  const [admin, locked] = await Promise.all([
    isAdmin(supabase, userId),
    isLocked(supabase, slug),
  ])
  return admin || !locked
}
