export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type ModuleRow = {
  id: string
  name: string
  is_active: boolean
  position: number
  developer_mode?: boolean
}

type RawModule = {
  id: string
  name: string
  is_active?: boolean
  position?: number
  developer_mode?: boolean
  status?: string
  order_index?: number
}

function toModuleRow(r: RawModule): ModuleRow {
  return {
    id: r.id,
    name: r.name,
    is_active: r.is_active ?? (r.status === 'live'),
    position: r.position ?? r.order_index ?? 0,
    developer_mode: r.developer_mode ?? false,
  }
}

function getRole(_userId: string, metaRole: unknown): 'admin' | 'user' {
  const m = typeof metaRole === 'string' && metaRole.toLowerCase().trim() === 'admin' ? 'admin' : null
  return m ?? 'user'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!supabaseAdmin) return NextResponse.json({ modules: [] })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const roleFromProfile = (profile?.role?.toLowerCase?.() ?? '') === 'admin' ? 'admin' : 'user'
    const metaRole = user.user_metadata?.role
    const isAdmin = (typeof metaRole === 'string' && metaRole.toLowerCase().trim() === 'admin') || roleFromProfile === 'admin'

    const url = new URL(request.url)
    const forAdmin = url.searchParams.get('admin') === '1'

    let query = supabaseAdmin
      .from('modules')
      .select('id, name, is_active, position, developer_mode')

    if (!forAdmin || !isAdmin) {
      query = query.eq('is_active', true)
    }
    query = query.order('position', { ascending: true })

    const { data: raw, error } = await query
    if (error) {
      const fallback = await supabaseAdmin
        .from('modules')
        .select('id, name, status, order_index')
        .in('status', isAdmin && forAdmin ? ['live', 'dev'] : ['live'])
        .order('order_index', { ascending: true })
      if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 })
      const modules = (fallback.data ?? []).map((r) => toModuleRow(r as RawModule))
      return NextResponse.json({ modules })
    }

    let modules = (raw ?? []).map(toModuleRow)
    if (!forAdmin) {
      modules = modules.filter((m) => m.is_active)
    }
    return NextResponse.json({ modules })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
