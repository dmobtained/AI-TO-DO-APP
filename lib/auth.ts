/**
 * Server-only auth helpers. Use in Server Components and API routes.
 */
import { createClient } from '@/lib/supabase/server'

export type Role = 'admin' | 'user'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Get role from profiles.role. Canonical: 'admin' | 'user' (lowercase).
 */
export async function getProfileRole(userId: string): Promise<Role> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  const r = data?.role
  if (r == null || typeof r !== 'string') return 'user'
  const normalized = r.toLowerCase().trim()
  return normalized === 'admin' ? 'admin' : 'user'
}

/**
 * Returns true if the current user is admin (metadata or profiles.role).
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getUser()
  if (!user) return false
  const metaRole = user.user_metadata?.role
  if (typeof metaRole === 'string' && metaRole.toLowerCase().trim() === 'admin') return true
  const role = await getProfileRole(user.id)
  return role === 'admin'
}
