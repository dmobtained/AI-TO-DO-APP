import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('leads')
    .select('id, user_id, title, stage, notes, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const title = String(body.title ?? '').trim() || 'Nieuwe lead'
  const stage = (body.stage as string) || 'lead'
  const validStages = ['lead', 'gesprek', 'deal']
  if (!validStages.includes(stage)) {
    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
  }

  const { data: row, error } = await supabase
    .from('leads')
    .insert({ user_id: user.id, title, stage, notes: body.notes?.trim() || null })
    .select('id, user_id, title, stage, notes, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: row })
}
