import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type SearchResult = {
  type: 'task' | 'finance'
  id: string
  title: string
  subtitle?: string
  href: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const results: SearchResult[] = []
    const term = `%${q}%`

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, due_date')
      .eq('user_id', user.id)
      .ilike('title', term)
      .limit(10)
    tasks?.forEach((t) => {
      results.push({
        type: 'task',
        id: t.id,
        title: t.title,
        subtitle: t.due_date ? new Date(t.due_date).toLocaleDateString('nl-NL') : undefined,
        href: '/dashboard/taken',
      })
    })

    const { data: entries } = await supabase
      .from('finance_entries')
      .select('id, title, entry_date')
      .eq('user_id', user.id)
      .ilike('title', term)
      .limit(10)
    entries?.forEach((e) => {
      results.push({
        type: 'finance',
        id: e.id,
        title: e.title,
        subtitle: e.entry_date ? new Date(e.entry_date).toLocaleDateString('nl-NL') : undefined,
        href: '/dashboard/financien',
      })
    })

    results.sort((a, b) => a.title.localeCompare(b.title))
    return NextResponse.json({ results: results.slice(0, 15) })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
