import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceModuleUnlocked } from '@/lib/moduleLockGuard'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const lockResponse = await enforceModuleUnlocked(supabase, 'auto_entries')
  if (lockResponse) return lockResponse

  const { error } = await supabase
    .from('auto_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
