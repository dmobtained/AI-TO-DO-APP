import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceModuleUnlocked } from '@/lib/moduleLockGuard'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const lockResponse = await enforceModuleUnlocked(supabase, 'leads')
  if (lockResponse) return lockResponse

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.stage && ['lead', 'gesprek', 'deal'].includes(body.stage)) updates.stage = body.stage
  const label = body.title !== undefined || body.name !== undefined
    ? String(body.title ?? body.name ?? '').trim() || ''
    : undefined
  if (label !== undefined) updates.name = label
  if (body.notes !== undefined) {
    updates.notes = body.notes ? String(body.notes).trim() : ''
  }

  const { data: row, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, user_id, name, stage, notes, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const r = row as { name?: string }
  return NextResponse.json({ lead: { ...row, title: r?.name ?? '' } })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const lockResponse = await enforceModuleUnlocked(supabase, 'leads')
  if (lockResponse) return lockResponse

  const { error } = await supabase.from('leads').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
