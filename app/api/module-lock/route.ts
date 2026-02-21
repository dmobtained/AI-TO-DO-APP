import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET ?moduleKey=xxx
 * Returns { locked: boolean, reason: string | null } for the given module.
 * Uses RPC get_module_lock(p_module_key) when available; else reads module_locks.
 */
export async function GET(request: NextRequest) {
  const moduleKey = request.nextUrl.searchParams.get('moduleKey')
  if (!moduleKey) {
    return NextResponse.json({ error: 'moduleKey required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: row, error } = await supabase.rpc('get_module_lock', {
    p_module_key: moduleKey,
  })

  if (error) {
    // Fallback: table might have slug/locked only
    const slugMap: Record<string, string> = { notes: 'notities', tasks: 'taken', auto_entries: 'auto' }
    const slug = slugMap[moduleKey] ?? moduleKey
    const { data: legacy } = await supabase
      .from('module_locks')
      .select('locked')
      .eq('slug', slug)
      .maybeSingle()
    if (legacy) {
      const r = legacy as { locked?: boolean }
      return NextResponse.json({ locked: r.locked ?? false, reason: null })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const r = row as { is_locked?: boolean; reason?: string | null } | null
  if (!r) return NextResponse.json({ locked: false, reason: null })
  return NextResponse.json({ locked: r.is_locked ?? false, reason: r.reason ?? null })
}
