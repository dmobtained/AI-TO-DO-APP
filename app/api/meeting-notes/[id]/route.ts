import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const updates: { content?: string; summary?: string; updated_at?: string } = {}
  if (body.content !== undefined) updates.content = String(body.content)
  if (body.summary !== undefined) updates.summary = body.summary == null ? null : String(body.summary)
  updates.updated_at = new Date().toISOString()

  const { data: row, error } = await supabase
    .from('meeting_notes')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, content, summary, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: row })
}
