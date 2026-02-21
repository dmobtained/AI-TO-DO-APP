import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceModuleUnlocked } from '@/lib/moduleLockGuard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('leads')
    .select('id, user_id, name, stage, notes, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []) as { name?: string }[]
  const leads = rows.map((r) => ({ ...r, title: r.name ?? '' }))
  return NextResponse.json({ leads })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const lockResponse = await enforceModuleUnlocked(supabase, 'leads')
  if (lockResponse) return lockResponse

  const body = await request.json().catch(() => ({}))
  const label = String(body.title ?? body.name ?? '').trim() || 'Nieuwe lead'
  const stage = (body.stage as string) || 'lead'
  const validStages = ['lead', 'gesprek', 'deal']
  if (!validStages.includes(stage)) {
    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
  }

  const { data: row, error } = await supabase
    .from('leads')
    .insert({ user_id: user.id, name: label, stage, notes: body.notes?.trim() || null })
    .select('id, user_id, name, stage, notes, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const r = row as { name?: string }
  return NextResponse.json({ lead: { ...row, title: r?.name ?? '' } })
}
