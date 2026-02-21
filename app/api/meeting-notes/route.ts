import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceModuleUnlocked } from '@/lib/moduleLockGuard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('meeting_notes')
    .select('id, title, content, summary, done, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const notes = data ?? []
  return NextResponse.json({ notes, note: notes[0] ?? null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const lockResponse = await enforceModuleUnlocked(supabase, 'meeting_notes')
  if (lockResponse) return lockResponse

  const body = await request.json().catch(() => ({}))
  const content = String(body.content ?? '').trim()
  const title = String(body.title ?? '').trim() || (content.split('\n')[0]?.slice(0, 200) || 'Vergadernotities')

  const { data: row, error } = await supabase
    .from('meeting_notes')
    .insert({ user_id: user.id, title, content, summary: null })
    .select('id, title, content, summary, done, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: row })
}
