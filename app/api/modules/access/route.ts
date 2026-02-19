import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getModuleWriteContext } from '@/lib/modules/pipeline'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ctx = await getModuleWriteContext(
    supabase,
    user.id,
    user.email ?? null,
    slug
  )
  return NextResponse.json({ canWrite: ctx.canWrite })
}
