/**
 * Module Engine – Write pipeline helper.
 * Use in API routes: get user, check canWrite, then run your DB write + audit.
 * Server-only.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { canWrite as checkCanWrite } from './access'

export type AuthUser = {
  id: string
  email: string | null
}

export type ModuleWriteContext = {
  user: AuthUser
  canWrite: boolean
}

/**
 * Returns current user and whether they can write in this module.
 * Use after createClient() and getUser(); if no user, return 401 before calling this.
 */
export async function getModuleWriteContext(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | null,
  slug: string
): Promise<ModuleWriteContext> {
  const writeAllowed = await checkCanWrite(supabase, slug, userId)
  return {
    user: { id: userId, email: userEmail },
    canWrite: writeAllowed,
  }
}
