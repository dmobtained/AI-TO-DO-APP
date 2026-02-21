export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceModuleUnlocked } from '@/lib/moduleLockGuard'

const ALLOWED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH']
const ALLOWED_STATUSES = ['OPEN', 'DONE']

type UpdateTaskBody = {
  title?: string
  details?: string | null
  priority?: string
  dueDate?: string | null
  tags?: string[]
  status?: string
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json(
      { error: 'Taak-id is verplicht.' },
      { status: 400 }
    )
  }

  let body: UpdateTaskBody
  try {
    body = (await req.json()) as UpdateTaskBody
  } catch {
    return NextResponse.json(
      { error: 'Ongeldige JSON payload.' },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.title === 'string') updates.title = body.title
  if (typeof body.details === 'string' || body.details === null)
    updates.details = body.details
  if (body.priority !== undefined) {
    if (!ALLOWED_PRIORITIES.includes(body.priority)) {
      return NextResponse.json(
        { error: 'Ongeldige priority-waarde.' },
        { status: 400 }
      )
    }
    updates.priority = body.priority
  }
  if (body.dueDate !== undefined) {
    updates.due_date =
      body.dueDate === null || body.dueDate === ''
        ? null
        : body.dueDate
  }
  if (Array.isArray(body.tags)) updates.tags = body.tags
  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: 'Ongeldige status-waarde. Gebruik OPEN of DONE.' },
        { status: 400 }
      )
    }
    updates.status = body.status
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'Geen velden om bij te werken.' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const lockResponse = await enforceModuleUnlocked(supabase, 'tasks')
    if (lockResponse) return lockResponse

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Taak niet gevonden of geen toegang.' },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      )
    }
    return NextResponse.json(task)
  } catch (err) {
    console.error('Fout in PATCH /api/tasks/[id]:', err)
    return NextResponse.json(
      { error: 'Interne serverfout of taak niet gevonden.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json(
      { error: 'Taak-id is verplicht.' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const lockResponse = await enforceModuleUnlocked(supabase, 'tasks')
    if (lockResponse) return lockResponse

    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!existing) {
      return NextResponse.json(
        { error: 'Taak niet gevonden of geen toegang.' },
        { status: 404 }
      )
    }
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) {
      return NextResponse.json(
        { error: error.message || 'Verwijderen mislukt.' },
        { status: 500 }
      )
    }
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('Fout in DELETE /api/tasks/[id]:', err)
    return NextResponse.json(
      { error: 'Interne serverfout of taak niet gevonden.' },
      { status: 500 }
    )
  }
}
