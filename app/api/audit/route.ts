import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Body = {
  action?: string
  entity_type?: string | null
  entity_id?: string | null
  metadata?: Record<string, unknown>
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as Body
    const action = typeof body.action === 'string' && body.action.trim() ? body.action.trim() : null
    if (!action) {
      return NextResponse.json({ error: 'action required' }, { status: 400 })
    }

    const entity_type = body.entity_type != null ? String(body.entity_type) : null
    const entity_id = body.entity_id ?? null
    const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {}

    const { error } = await supabase.from('activity_log').insert({
      actor_user_id: user.id,
      actor_email: user.email ?? null,
      action,
      entity_type,
      entity_id: typeof entity_id === 'string' ? entity_id : null,
      metadata,
    })

    if (error) {
      console.warn('[audit] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.warn('[audit] POST error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
