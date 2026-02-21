/**
 * Server-side module lock guard.
 * Call in API write handlers (POST/PATCH/PUT/DELETE).
 * Uses RPC: public.is_module_locked(p_module_key) -> boolean (admin bypass in DB).
 */

import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Enforce that the module is not locked for writes.
 * Call after auth, before performing the write.
 *
 * @returns null if unlocked (proceed); else NextResponse to return (423 locked or 500 error)
 */
export async function enforceModuleUnlocked(
  supabase: SupabaseClient,
  moduleKey: string
): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc('is_module_locked', {
    p_module_key: moduleKey,
  })

  if (error) {
    return NextResponse.json(
      { error: 'Module lock check failed', details: error.message },
      { status: 500 }
    ) as NextResponse
  }

  if (data === true) {
    return NextResponse.json(
      { error: 'Module locked', moduleKey },
      { status: 423 }
    ) as NextResponse
  }

  return null
}
