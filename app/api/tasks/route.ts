export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceModuleUnlocked } from '@/lib/moduleLockGuard'

const ALLOWED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH']

/** GET: lijst taken voor de ingelogde gebruiker */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, status, created_at, user_id, details, priority, due_date, tags, context, estimated_time, energy_level')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      return NextResponse.json(
        { error: error.message || 'Taken ophalen mislukt.' },
        { status: 500 }
      )
    }
    return NextResponse.json(tasks ?? [])
  } catch (err) {
    console.error('Fout in GET /api/tasks:', err)
    return NextResponse.json(
      { error: 'Interne serverfout.' },
      { status: 500 }
    )
  }
}

type PostTaskBody = {
  title: string
  details?: string | null
  priority?: string
  due_date?: string | null
  tags?: string[]
  context?: string | null
  estimated_time?: number | null
  energy_level?: string
}

/** POST: nieuwe taak (user_id uit sessie) */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const lockResponse = await enforceModuleUnlocked(supabase, 'tasks')
    if (lockResponse) return lockResponse

    let body: PostTaskBody
    try {
      body = (await req.json()) as PostTaskBody
    } catch {
      return NextResponse.json(
        { error: 'Ongeldige JSON payload.' },
        { status: 400 }
      )
    }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) {
      return NextResponse.json(
        { error: 'Titel is verplicht.' },
        { status: 400 }
      )
    }
    const priority = body.priority && ALLOWED_PRIORITIES.includes(body.priority)
      ? body.priority
      : 'MEDIUM'
    const payload = {
      title,
      status: 'OPEN',
      user_id: user.id,
      details: typeof body.details === 'string' ? body.details.trim() || null : null,
      priority,
      due_date: body.due_date && body.due_date !== '' ? body.due_date : null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      context: typeof body.context === 'string' ? body.context || null : null,
      estimated_time: typeof body.estimated_time === 'number' ? body.estimated_time : null,
      energy_level: typeof body.energy_level === 'string' ? body.energy_level : 'MEDIUM',
    }
    const { data: task, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select()
      .single()
    if (error) {
      return NextResponse.json(
        { error: error.message || 'Taak aanmaken mislukt.' },
        { status: 500 }
      )
    }
    return NextResponse.json(task)
  } catch (err) {
    console.error('Fout in POST /api/tasks:', err)
    return NextResponse.json(
      { error: 'Interne serverfout.' },
      { status: 500 }
    )
  }
}
