import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type AdminUser = {
  id: string
  email: string | null
  role: 'ADMIN' | 'USER'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin not configured' }, { status: 503 })
    const metaRole = session.user.user_metadata?.role
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
    const isAdmin = (typeof metaRole === 'string' && metaRole.toUpperCase() === 'ADMIN') || profile?.role === 'ADMIN'
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

    const profileById = new Map<string, 'ADMIN' | 'USER'>((profiles ?? []).map((p) => [p.id, p.role === 'ADMIN' ? 'ADMIN' : 'USER']))
    const users: AdminUser[] = (authData?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? null,
      role: profileById.get(u.id) ?? 'USER',
    }))

    return NextResponse.json({ users })
  } catch (err) {
    console.error('[admin/users] exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
