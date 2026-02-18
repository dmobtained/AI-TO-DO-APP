import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type PatchBody = { role: 'ADMIN' | 'USER' }

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const admin = supabaseAdmin

    const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const isAdmin = myProfile?.role === 'ADMIN' || (user.user_metadata?.role && String(user.user_metadata.role).toUpperCase() === 'ADMIN')
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = (await request.json()) as PatchBody
    const role = body?.role === 'ADMIN' || body?.role === 'USER' ? body.role : undefined
    if (!role) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

    let authMetadataUpdated = false

    if (admin) {
      const { data: targetUser } = await admin.auth.admin.getUserById(id)
      const existingMeta = (targetUser?.user?.user_metadata as Record<string, unknown>) ?? {}
      const { error: authError } = await admin.auth.admin.updateUserById(id, {
        user_metadata: { ...existingMeta, role },
      })
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 500 })
      }
      authMetadataUpdated = true
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select('id, role')
      .single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ id: data.id, role: data.role, auth_metadata_updated: authMetadataUpdated })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
