import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getModuleWriteContext } from '@/lib/modules/pipeline'
import { logModuleAction } from '@/lib/modules/audit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const MODULE_SLUG = 'notities'

const createNoteSchema = z.object({
  title: z.string().max(500).default(''),
  content: z.string().max(50000).default(''),
  pinned: z.boolean().default(false),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('notes')
    .select('id, user_id, title, content, pinned, created_at, updated_at')
    .eq('user_id', user.id)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ notes: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ctx = await getModuleWriteContext(supabase, user.id, user.email ?? null, MODULE_SLUG)
  if (!ctx.canWrite) {
    return NextResponse.json({ error: 'Module is read-only' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = createNoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data: row, error } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      content: parsed.data.content,
      pinned: parsed.data.pinned,
    })
    .select('id, user_id, title, content, pinned, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logModuleAction({
    supabase,
    userId: user.id,
    userEmail: user.email ?? null,
    module: 'notes',
    operation: 'create',
    entityId: row.id,
    metadata: { title: row.title },
  })

  return NextResponse.json({ note: row })
}
