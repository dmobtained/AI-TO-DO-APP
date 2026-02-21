export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { ok: false, status: 401 as const, body: { error: 'Unauthorized' } }
  if (!supabaseAdmin) return { ok: false, status: 503 as const, body: { error: 'Admin not configured' } }
  const metaRole = session.user.user_metadata?.role
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
  const isAdmin = (typeof metaRole === 'string' && metaRole.toLowerCase().trim() === 'admin') || (profile?.role?.toLowerCase?.() ?? '') === 'admin'
  if (!isAdmin) return { ok: false, status: 403 as const, body: { error: 'Forbidden' } }
  return { ok: true as const }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  const { data, err } = await supabaseAdmin!
    .from('settings')
    .select('key, value')
    .is('user_id', null)
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ settings: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  const body = await request.json().catch(() => ({}))
  const key = typeof body.key === 'string' ? body.key.trim() : null
  const value = body.value
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })
  const valueStr = value === true || value === 'true' ? 'true' : value === false || value === 'false' ? 'false' : String(value ?? '')
  const { error: upsertErr } = await supabaseAdmin!
    .from('settings')
    .upsert({ key, value: valueStr, user_id: null }, { onConflict: 'key' })
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  return NextResponse.json({ key, value: valueStr })
}
