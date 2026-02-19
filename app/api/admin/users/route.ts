export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type AdminUser = {
  id: string
  email: string | null
  role: 'admin' | 'user'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin not configured' }, { status: 503 })
    const metaRole = session.user.user_metadata?.role
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
    const isAdmin = (typeof metaRole === 'string' && metaRole.toLowerCase().trim() === 'admin') || (profile?.role?.toLowerCase?.() ?? '') === 'admin'
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (authError) {
      console.error('[admin/users] listUsers error:', authError.message)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
    if (profilesError) {
      console.error('[admin/users] profiles error:', profilesError.message)
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    const profileById = new Map<string, 'admin' | 'user'>((profiles ?? []).map((p) => {
      const r = (p.role ?? 'user').toString().toLowerCase().trim()
      return [p.id, r === 'admin' ? 'admin' : 'user'] as const
    }))
    const users: AdminUser[] = (authData?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? null,
      role: profileById.get(u.id) ?? 'user',
    }))

    return NextResponse.json({ users })
  } catch (err) {
    console.error('[admin/users] exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
