export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceModuleUnlocked } from '@/lib/moduleLockGuard'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, details, priority, due_date, status, tags, created_at, user_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const list = (tasks ?? []) as { due_date: string | null; created_at: string; status: string }[]
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const openCount = list.filter((t) => t.status === 'OPEN').length
    const doneCount = list.filter((t) => t.status === 'DONE').length
    const todayCount = list.filter((t) => {
      if (!t.due_date) return false
      const d = new Date(t.due_date)
      return d >= todayStart && d < todayEnd
    }).length

    return NextResponse.json({
      tasks: list,
      stats: {
        open: openCount,
        done: doneCount,
        today: todayCount,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Interne serverfout.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const lockResponse = await enforceModuleUnlocked(supabase, 'tasks')
    if (lockResponse) return lockResponse

    const body = await request.json().catch(() => ({})) as { title?: string; status?: string; details?: string; priority?: string; due_date?: string }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return NextResponse.json({ error: 'title verplicht' }, { status: 400 })

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        status: body.status === 'DONE' ? 'DONE' : 'OPEN',
        details: typeof body.details === 'string' ? body.details.trim() || null : null,
        priority: body.priority ?? null,
        due_date: body.due_date && /^\d{4}-\d{2}-\d{2}/.test(String(body.due_date)) ? body.due_date : null,
      })
      .select('id, title, details, priority, due_date, status, tags, created_at, user_id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(task)
  } catch {
    return NextResponse.json({ error: 'Interne serverfout.' }, { status: 500 })
  }
}
