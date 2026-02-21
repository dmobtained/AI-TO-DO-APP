export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MODULE_KEYS, MODULE_LABELS } from '@/lib/moduleLockConfig'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin_user')
  if (rpcError) return { error: NextResponse.json({ error: 'Admin check failed', details: rpcError.message }, { status: 500 }) }
  if (!isAdmin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { error: null }
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  const supabase = await createClient()

  const { data: locks, error: fetchError } = await supabase
    .from('module_locks')
    .select('module_key, is_locked, reason, locked_by, updated_at')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const byKey: Record<string, { is_locked: boolean; reason: string | null; locked_by: string | null; updated_at: string | null }> = {}
  for (const row of locks ?? []) {
    const r = row as { module_key?: string; is_locked?: boolean; reason?: string | null; locked_by?: string | null; updated_at?: string | null }
    if (r.module_key) byKey[r.module_key] = { is_locked: r.is_locked ?? false, reason: r.reason ?? null, locked_by: r.locked_by ?? null, updated_at: r.updated_at ?? null }
  }
  const modules = MODULE_KEYS.map((key) => ({
    module_key: key,
    label: MODULE_LABELS[key] ?? key,
    is_locked: byKey[key]?.is_locked ?? false,
    reason: byKey[key]?.reason ?? null,
    locked_by: byKey[key]?.locked_by ?? null,
    updated_at: byKey[key]?.updated_at ?? null,
  }))
  return NextResponse.json({ modules })
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  if (body.action === 'killswitch') {
    const locked = body.locked === true || body.locked === 'true'
    const reason = typeof body.reason === 'string' ? body.reason.trim() : (locked ? 'Kill switch' : '')
    const { error: rpcErr } = await supabase.rpc('set_killswitch', {
      p_locked: locked,
      p_reason: reason || null,
    })
    if (rpcErr) return NextResponse.json({ error: 'Kill switch failed', details: rpcErr.message }, { status: 500 })
    return NextResponse.json({ action: 'killswitch', locked })
  }

  const moduleKey = typeof body.module_key === 'string' ? body.module_key.trim() : null
  const isLocked = body.is_locked === true || body.is_locked === 'true'
  const reason = typeof body.reason === 'string' ? body.reason.trim() : (isLocked ? 'Onderhoud' : '')

  if (!moduleKey) return NextResponse.json({ error: 'module_key required' }, { status: 400 })

  const row = {
    module_key: moduleKey,
    is_locked: isLocked,
    reason: reason || null,
    locked_by: user.id,
    updated_at: new Date().toISOString(),
  }
  const { error: upsertErr } = await supabase
    .from('module_locks')
    .upsert(row, { onConflict: 'module_key' })

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  return NextResponse.json({ module_key: moduleKey, is_locked: isLocked })
}
