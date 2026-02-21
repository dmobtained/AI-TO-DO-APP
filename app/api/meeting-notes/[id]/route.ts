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
  const lockResponse = await enforceModuleUnlocked(supabase, 'meeting_notes')
  if (lockResponse) return lockResponse

  const body = await request.json().catch(() => ({}))
  // Supabase .update() string fields: use '' to clear, never null (TypeScript: string | undefined only)
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.title !== undefined) updates.title = String(body.title).trim() || ''
  if (body.content !== undefined) updates.content = String(body.content)
  if (body.summary !== undefined) {
    updates.summary = body.summary ? String(body.summary).trim() : ''
  }
  if (body.done !== undefined) updates.done = body.done === true || body.done === 'true'

  const { data: row, error } = await supabase
    .from('meeting_notes')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, title, content, summary, done, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: row })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const lockResponse = await enforceModuleUnlocked(supabase, 'meeting_notes')
  if (lockResponse) return lockResponse

  const { error } = await supabase
    .from('meeting_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
