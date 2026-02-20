'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { PageContainer } from '@/components/ui/PageContainer'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar as CalendarIcon } from 'lucide-react'

type Task = {
  id: string
  title: string
  status: string
  due_date: string
  created_at: string
  user_id: string
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days: Date[] = []
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d))
  }
  return days
}

function formatDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default function AgendaPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useDashboardUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(() => new Date())

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthLabel = viewDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })

  const fetchTasks = useCallback(async () => {
    if (!user?.id) return
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, status, due_date, created_at, user_id')
      .eq('user_id', user.id)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })
    if (error) {
      setTasks([])
      return
    }
    setTasks((data ?? []) as Task[])
  }, [user?.id])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/')
      return
    }
    setLoading(true)
    fetchTasks().finally(() => setLoading(false))
  }, [user, authLoading, router, fetchTasks])

  const map: Record<string, Task[]> = {}
  for (const t of tasks) {
    const key = t.due_date ? t.due_date.slice(0, 10) : ''
    if (!key) continue
    if (!map[key]) map[key] = []
    map[key].push(t)
  }
  const tasksByDayMap = map

  const monthDays = getMonthDays(year, month)
  const firstWeekday = new Date(year, month, 1).getDay()
  const startPadding = firstWeekday === 0 ? 6 : firstWeekday - 1

  if (authLoading || !user) {
    return (
      <PageContainer>
        <div className="h-8 w-48 rounded bg-slate-200 animate-pulse" />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <SectionHeader
        title="Agenda"
        subtitle="Taken met deadline"
      />

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Vorige
        </button>
        <span className="text-lg font-semibold text-slate-900 capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Volgende
        </button>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-600">
            {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((d) => (
              <div key={d} className="border-r border-slate-200 py-2 last:border-r-0">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: startPadding }, (_, i) => (
              <div key={`pad-${i}`} className="min-h-[80px] border-b border-r border-slate-100 bg-slate-50/50" />
            ))}
            {monthDays.map((day) => {
              const key = formatDayKey(day)
              const dayTasks = tasksByDayMap[key] ?? []
              const isToday =
                day.getFullYear() === new Date().getFullYear() &&
                day.getMonth() === new Date().getMonth() &&
                day.getDate() === new Date().getDate()
              return (
                <div
                  key={key}
                  className={`min-h-[80px] border-b border-r border-slate-100 p-1 last:border-r-0 ${
                    isToday ? 'bg-blue-50/50' : 'bg-white'
                  }`}
                >
                  <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                    {day.getDate()}
                  </span>
                  <ul className="mt-1 space-y-0.5">
                    {dayTasks.slice(0, 3).map((t) => (
                      <li
                        key={t.id}
                        className={`truncate rounded px-1.5 py-0.5 text-xs ${
                          t.status === 'DONE' ? 'bg-slate-100 text-slate-500 line-through' : 'bg-slate-200/80 text-slate-800'
                        }`}
                        title={t.title}
                      >
                        {t.title}
                      </li>
                    ))}
                    {dayTasks.length > 3 && (
                      <li className="text-xs text-slate-500 pl-1">+{dayTasks.length - 3}</li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {!loading && tasks.length === 0 && (
        <EmptyState
          icon={CalendarIcon}
          title="Geen taken met deadline"
          description="Voeg bij Taken een deadline toe om ze hier te zien."
          className="mt-8"
        />
      )}
    </PageContainer>
  )
}
