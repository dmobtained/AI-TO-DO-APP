export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!supabaseAdmin) return { error: NextResponse.json({ error: 'Admin not configured' }, { status: 503 }) }
  const metaRole = session.user.user_metadata?.role
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
  const isAdmin = (typeof metaRole === 'string' && metaRole.toLowerCase().trim() === 'admin') || (profile?.role?.toLowerCase?.() ?? '') === 'admin'
  if (!isAdmin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { error: null }
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  const supabase = await createClient()
  const { data, error: fetchError } = await supabase.from('module_locks').select('slug, locked').order('slug')
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  return NextResponse.json({ locks: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error
  if (!supabaseAdmin) return NextResponse.json({ error: 'Admin not configured' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const slug = typeof body.slug === 'string' ? body.slug.trim() : null
  const locked = body.locked === true || body.locked === 'true'
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const { error: upsertErr } = await supabaseAdmin
    .from('module_locks')
    .upsert({ slug, locked, updated_at: new Date().toISOString() }, { onConflict: 'slug' })
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  return NextResponse.json({ slug, locked })
}
