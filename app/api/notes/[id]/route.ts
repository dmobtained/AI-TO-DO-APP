import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceModuleUnlocked } from '@/lib/moduleLockGuard'
import { logModuleAction } from '@/lib/modules/audit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const MODULE_SLUG = 'notes'

const updateNoteSchema = z.object({
  title: z.string().max(500).optional(),
  content: z.string().max(50000).optional(),
  pinned: z.boolean().optional(),
})

/** GET /api/notes/[id] – get one note */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('notes')
    .select('id, user_id, title, content, pinned, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (data.user_id !== user.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const isAdmin = (profile as { role?: string } | null)?.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
  return NextResponse.json({ note: data })
}

/** PATCH /api/notes/[id] – update note */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lockResponse = await enforceModuleUnlocked(supabase, MODULE_SLUG)
  if (lockResponse) return lockResponse

  const body = await request.json().catch(() => ({}))
  const parsed = updateNoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  }

  const { data: row, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', id)
    .select('id, user_id, title, content, pinned, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await logModuleAction({
    supabase,
    userId: user.id,
    userEmail: user.email ?? null,
    module: 'notes',
    operation: 'update',
    entityId: id,
    metadata: { title: row.title, fields: Object.keys(parsed.data) },
  })

  return NextResponse.json({ note: row })
}

/** DELETE /api/notes/[id] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lockResponse = await enforceModuleUnlocked(supabase, MODULE_SLUG)
  if (lockResponse) return lockResponse

  const { data: deleted, error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await logModuleAction({
    supabase,
    userId: user.id,
    userEmail: user.email ?? null,
    module: 'notes',
    operation: 'delete',
    entityId: id,
    metadata: {},
  })

  return NextResponse.json({ ok: true })
}
