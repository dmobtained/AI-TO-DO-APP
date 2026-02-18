export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    })

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const openCount = tasks.filter((t) => t.status === 'OPEN').length
    const doneCount = tasks.filter((t) => t.status === 'DONE').length
    const todayCount = tasks.filter((t) => {
      if (!t.dueDate) return false
      const d = new Date(t.dueDate)
      return d >= todayStart && d < todayEnd
    }).length

    return NextResponse.json({
      tasks,
      stats: {
        open: openCount,
        done: doneCount,
        today: todayCount,
      },
    })
  } catch (error) {
    console.error('Fout in GET /api/tasks:', error)
    return NextResponse.json(
      { error: 'Interne serverfout.' },
      { status: 500 }
    )
  }
}
