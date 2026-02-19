export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string | null,
  action: string
) {
  await supabase.from('activity_log').insert({
    actor_user_id: userId,
    actor_email: email ?? null,
    action,
    entity_type: null,
    entity_id: null,
    metadata: {},
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin not configured' }, { status: 503 })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if ((profile?.role?.toLowerCase?.() ?? '') !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const updates: Record<string, unknown> = {}

    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active
    if (typeof body.position === 'number') updates.position = body.position
    if (typeof body.developer_mode === 'boolean') updates.developer_mode = body.developer_mode
    if (body.status === 'live' || body.status === 'dev') {
      updates.is_active = body.status === 'live'
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin.from('modules').select('name').eq('id', id).single()
    const moduleName = (existing as { name?: string } | null)?.name ?? id

    const { data, error } = await supabaseAdmin
      .from('modules')
      .update(updates)
      .eq('id', id)
      .select('id, name, is_active, position, developer_mode, status, order_index')
      .single()
    if (error) {
      const alt = await supabaseAdmin.from('modules').update(updates).eq('id', id).select('id, name, status, order_index').single()
      if (alt.error) return NextResponse.json({ error: alt.error.message }, { status: 500 })
      await logActivity(supabase, user.id, user.email ?? null, `module_updated:${moduleName}`)
      return NextResponse.json(alt.data)
    }
    await logActivity(supabase, user.id, user.email ?? null, `module_updated:${moduleName}`)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
