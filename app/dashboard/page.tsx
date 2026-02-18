"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useDashboard } from '@/context/DashboardContext'
import { useToast } from '@/context/ToastContext'
import { OverviewCard } from '@/components/dashboard/OverviewCard'
import { LayoutDashboard, Calendar, TrendingUp, Sparkles } from 'lucide-react'

function getMonthRange() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { first, last }
}

function getTodayStartEnd() {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()
  const start = new Date(y, m, d).toISOString().slice(0, 10)
  const end = new Date(y, m, d + 1).toISOString().slice(0, 10)
  return { start, end }
}

type Task = {
  id: string
  title: string
  status: string
  created_at: string
  due_date: string | null
  user_id: string
  details?: string | null
}

function isSameDay(iso: string | null, day: Date): boolean {
  if (!iso) return false
  const d = new Date(iso)
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate()
}

export default function DashboardPage() {
  const supabase = getSupabaseClient()
  const router = useRouter()
  const { canSee } = useDashboard()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [openTasksToday, setOpenTasksToday] = useState(0)
  const [incomeMonth, setIncomeMonth] = useState(0)
  const [expenseMonth, setExpenseMonth] = useState(0)
  const [openTasks, setOpenTasks] = useState<Task[]>([])
  const [focusTasks, setFocusTasks] = useState<Task[]>([])
  const [daynote, setDaynote] = useState<string | null>(null)
  const [daynoteStatus, setDaynoteStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [daynoteError, setDaynoteError] = useState<string | null>(null)

  const fetchOverview = useCallback(async (userId: string) => {
    const { first, last } = getMonthRange()
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().slice(0, 10)

    const [tasksRes, financeRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, status, created_at, due_date, user_id')
        .eq('user_id', userId)
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false }),
      supabase
        .from('finance_entries')
        .select('type, amount')
        .eq('user_id', userId)
        .gte('entry_date', first)
        .lte('entry_date', last),
    ])

    const tasks = (tasksRes.data ?? []) as Task[]
    const todayCount = tasks.filter(
      (t) => isSameDay(t.due_date, today) || (t.created_at >= todayStr && t.created_at < tomorrowStr)
    ).length
    setOpenTasksToday(todayCount)

    let inM = 0
    let exM = 0
    ;(financeRes.data ?? []).forEach((row: { type: string; amount: string }) => {
      const n = Number(row.amount) || 0
      if (row.type === 'income') inM += n
      else exM += n
    })
    setIncomeMonth(inM)
    setExpenseMonth(exM)

    const sortedForFocus = [...tasks].sort((a, b) => {
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity
      if (aDue !== bDue) return aDue - bDue
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    setFocusTasks(sortedForFocus.slice(0, 3))
    setOpenTasks(tasks.slice(0, 8))
  }, [])

  useEffect(() => {
    let mounted = true
    const TIMEOUT_MS = 15000
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/')
          return
        }
        if (!mounted) return
        setLoading(true)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
        )
        await Promise.race([fetchOverview(user.id), timeoutPromise])
      } catch (err) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'Kon gegevens niet laden'
          if (msg === 'Timeout') toast('Laden duurde te lang. Controleer je verbinding.', 'error')
          else toast(msg, 'error')
          setOpenTasks([])
          setFocusTasks([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => {
      mounted = false
    }
  }, [router, fetchOverview, toast])

  const handleToggleTask = async (task: Task) => {
    const nextStatus = task.status === 'OPEN' ? 'DONE' : 'OPEN'
    const { error } = await supabase.from('tasks').update({ status: nextStatus }).eq('id', task.id).eq('user_id', task.user_id)
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast(nextStatus === 'DONE' ? 'Taak afgerond' : 'Taak geopend')
    const { data: { user } } = await supabase.auth.getUser()
    if (user) fetchOverview(user.id)
  }

  const handleDeleteTask = async (id: string, userId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId)
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast('Taak verwijderd')
    setOpenTasks((prev) => prev.filter((t) => t.id !== id))
    setFocusTasks((prev) => prev.filter((t) => t.id !== id))
    const { data: { user } } = await supabase.auth.getUser()
    if (user) fetchOverview(user.id)
  }

  const handleGenerateDaynote = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setDaynoteStatus('error')
      setDaynoteError('Niet ingelogd.')
      return
    }

    setDaynoteStatus('loading')
    setDaynoteError(null)
    setDaynote(null)

    try {
      const res = await fetch('/api/ai/daynote', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      const message = typeof data?.error === 'string' ? data.error : undefined

      if (!res.ok) {
        setDaynoteStatus('error')
        setDaynoteError(message ?? (res.status === 503 ? 'AI Hub-webhook is niet geconfigureerd.' : `Fout: ${res.status}`))
        toast(message ?? 'Dagnotitie kon niet worden opgehaald.', 'error')
        return
      }

      const note = data?.note
      if (typeof note !== 'string' || note.length <= 20) {
        setDaynoteStatus('error')
        setDaynoteError('Ongeldige of te korte notitie ontvangen.')
        toast('Ongeldige notitie ontvangen.', 'error')
        return
      }

      setDaynote(note)
      setDaynoteStatus('success')
      toast('Dagnotitie gegenereerd.')
    } catch (err) {
      setDaynoteStatus('error')
      const msg = err instanceof Error ? err.message : 'Er is iets misgegaan.'
      setDaynoteError(msg)
      toast(msg, 'error')
    }
  }, [])

  const freeToSpend = incomeMonth - expenseMonth

  return (
    <div className="mx-auto max-w-6xl animate-fade-in-up">
      <h1 className="text-2xl font-semibold tracking-tight text-datadenkt-white">Dashboard</h1>
      <p className="text-datadenkt-white/70 text-sm mt-1">Overzicht van vandaag en deze maand</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <OverviewCard
          title="Open taken vandaag"
          value={loading ? '—' : openTasksToday}
          icon={<LayoutDashboard className="h-6 w-6" />}
          accent="teal"
          delay={0}
        />
        <OverviewCard
          title="Vandaag"
          value={loading ? '—' : focusTasks.length}
          icon={<Calendar className="h-6 w-6" />}
          accent="orange"
          delay={50}
        />
        <OverviewCard
          title="Maand Cashflow"
          value={loading ? '—' : `€ ${freeToSpend.toFixed(2)}`}
          icon={<TrendingUp className="h-6 w-6" />}
          accent={freeToSpend >= 0 ? 'teal' : 'red'}
          delay={100}
        />
        <OverviewCard
          title="AI Suggesties"
          value={daynoteStatus === 'success' ? 'Klaar' : loading ? '—' : 'Genereer'}
          icon={<Sparkles className="h-6 w-6" />}
          accent="muted"
          delay={150}
        />
      </div>

      <div className="mt-8 card-primary p-6">
        <h2 className="text-lg font-semibold text-datadenkt-white mb-4">Dagnotitie</h2>
        <button
          type="button"
          onClick={handleGenerateDaynote}
          disabled={daynoteStatus === 'loading'}
          className="btn-accent w-auto px-4 py-2.5 text-sm disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-2"
        >
          {daynoteStatus === 'loading' && (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          Genereer Dagnotitie
        </button>
        {daynoteStatus === 'error' && daynoteError && (
          <p className="mt-3 text-sm text-red-400">{daynoteError}</p>
        )}
        {daynoteStatus === 'success' && daynote && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-slate-500 mb-2">
              {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <pre className="text-sm text-datadenkt-white/90 whitespace-pre-line font-sans bg-datadenkt-navy-dark p-4 rounded-xl border border-white/10">
              {daynote}
            </pre>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(daynote)
                toast('Gekopieerd naar klembord.')
              }}
              className="mt-2 btn-accent px-3 py-1.5 text-sm"
            >
              Kopiëren
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {canSee('dashboard_tasks_list') && (
          <div className="card-primary overflow-hidden hover:scale-[1.02]">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-datadenkt-white">Open taken</h2>
            </div>
            {loading ? (
              <ul className="divide-y divide-white/5">
                {[1, 2, 3, 4].map((i) => (
                  <li key={i} className="px-6 py-4">
                    <div className="h-5 w-3/4 rounded bg-white/10 animate-pulse" />
                  </li>
                ))}
              </ul>
            ) : openTasks.length === 0 ? (
              <div className="px-6 py-8 text-center text-datadenkt-white/60 text-sm">Geen open taken.</div>
            ) : (
              <ul className="divide-y divide-white/5">
                {openTasks.map((task) => (
                  <li key={task.id} className="px-6 py-3 flex items-center gap-3 group">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task)}
                      className="shrink-0 w-5 h-5 rounded-full border-2 border-datadenkt-white/30 bg-transparent flex items-center justify-center hover:border-datadenkt-teal focus:ring-2 focus:ring-datadenkt-teal transition-all duration-200"
                      aria-label="Afvinken"
                    >
                      {task.status === 'DONE' && (
                        <span className="w-2 h-2 rounded-full bg-datadenkt-teal" />
                      )}
                    </button>
                    <Link href="/dashboard/taken" className="flex-1 min-w-0 truncate text-sm font-medium text-datadenkt-white/90 hover:text-datadenkt-teal transition-colors duration-200">
                      {task.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id, task.user_id)}
                      className="shrink-0 text-xs text-datadenkt-white/60 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Verwijderen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {canSee('focus_today') && (
          <div className="card-primary overflow-hidden hover:scale-[1.02]">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-datadenkt-white">Focusblok vandaag</h2>
            </div>
            {loading ? (
              <ul className="divide-y divide-white/5">
                {[1, 2, 3].map((i) => (
                  <li key={i} className="px-6 py-4">
                    <div className="h-5 w-2/3 rounded bg-white/10 animate-pulse" />
                  </li>
                ))}
              </ul>
            ) : focusTasks.length === 0 ? (
              <div className="px-6 py-8 text-center text-datadenkt-white/60 text-sm">Geen prioriteiten.</div>
            ) : (
              <ul className="divide-y divide-white/5">
                {focusTasks.map((task) => (
                  <li key={task.id} className="px-6 py-3 flex items-center gap-3 group">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task)}
                      className="shrink-0 w-5 h-5 rounded-full border-2 border-datadenkt-white/30 bg-transparent flex items-center justify-center hover:border-datadenkt-teal focus:ring-2 focus:ring-datadenkt-teal transition-all duration-200"
                      aria-label="Markeer als gedaan"
                    >
                      {task.status === 'DONE' && (
                        <span className="w-2 h-2 rounded-full bg-datadenkt-teal" />
                      )}
                    </button>
                    <span className="flex-1 min-w-0 truncate text-sm font-medium text-datadenkt-white/90">{task.title}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id, task.user_id)}
                      className="shrink-0 text-xs text-datadenkt-white/60 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Verwijderen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {(canSee('cashflow_forecast') || canSee('financial_warnings') || canSee('productivity_meter') || canSee('decision_log')) && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {canSee('cashflow_forecast') && <DashboardCashflowWidget />}
          {canSee('financial_warnings') && <DashboardWarningsWidget />}
          {canSee('productivity_meter') && <DashboardProductivityWidget />}
          {canSee('decision_log') && <DashboardDecisionLogWidget />}
        </div>
      )}
    </div>
  )
}

function DashboardCashflowWidget() {
  const supabase = getSupabaseClient()
  const [status, setStatus] = useState<'loading' | 'data' | 'nodata'>('loading')
  const [forecast7, setForecast7] = useState<string | null>(null)
  const [forecast30, setForecast30] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function run() {
      let user: { id: string } | null = null
      try {
        const res = await supabase.auth.getUser()
        user = res?.data?.user ?? null
      } catch {
        if (!mounted) return
        return
      }
      if (!user || !mounted) return
      const now = new Date()
      const start = new Date(now)
      start.setDate(start.getDate() - 30)
      const startStr = start.toISOString().slice(0, 10)
      const endStr = now.toISOString().slice(0, 10)
      const { data } = await supabase
        .from('finance_entries')
        .select('type, amount, entry_date')
        .eq('user_id', user.id)
        .gte('entry_date', startStr)
        .lte('entry_date', endStr)
      if (!mounted) return
      const rows = (data ?? []) as { type: string; amount: string; entry_date: string }[]
      if (rows.length < 7) {
        setStatus('nodata')
        return
      }
      let net = 0
      const byDay = new Map<string, number>()
      rows.forEach((r) => {
        const n = Number(r.amount) || 0
        const v = r.type === 'income' ? n : -n
        net += v
        const d = r.entry_date
        byDay.set(d, (byDay.get(d) ?? 0) + v)
      })
      const days = byDay.size || 1
      const avgDaily = net / 30
      const proxy = net
      setForecast7(String((proxy + avgDaily * 7).toFixed(2)))
      setForecast30(String((proxy + avgDaily * 30).toFixed(2)))
      setStatus('data')
    }
    run()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="card-primary p-6 hover:scale-[1.02]">
      <h2 className="text-lg font-semibold text-datadenkt-white mb-2">Cashflow voorspelling</h2>
      {status === 'loading' && <p className="text-datadenkt-white/60 text-sm">Laden…</p>}
      {status === 'nodata' && <p className="text-datadenkt-white/60 text-sm">Nog onvoldoende data</p>}
      {status === 'data' && (
        <div className="space-y-1 text-sm text-datadenkt-teal">
          <p>7 dagen: € {Number(forecast7).toFixed(2)}</p>
          <p>30 dagen: € {Number(forecast30).toFixed(2)}</p>
        </div>
      )}
    </div>
  )
}

function DashboardWarningsWidget() {
  const supabase = getSupabaseClient()
  const [warnings, setWarnings] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function run() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
      const { data: thisData } = await supabase
        .from('finance_entries')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('entry_date', thisMonthStart)
        .lte('entry_date', thisMonthEnd)
      const { data: lastData } = await supabase
        .from('finance_entries')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('entry_date', lastMonthStart)
        .lte('entry_date', lastMonthEnd)
      if (!mounted) return
      let thisExp = 0
      let thisInc = 0
      ;(thisData ?? []).forEach((r: { type: string; amount: string }) => {
        const n = Number(r.amount) || 0
        if (r.type === 'expense') thisExp += n
        else thisInc += n
      })
      let lastExp = 0
      ;(lastData ?? []).forEach((r: { type: string; amount: string }) => {
        if (r.type === 'expense') lastExp += parseFloat(r.amount) || 0
      })
      const list: string[] = []
      if (lastExp > 0 && thisExp > lastExp * 1.15) list.push('Uitgaven deze maand > 15% hoger dan vorige maand')
      const net = thisInc - thisExp
      if (thisInc > 0 && net / thisInc < 0.2) list.push('Spaarquote onder 20%')
      setWarnings(list.slice(0, 3))
      setLoading(false)
    }
    run()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="card-primary p-6 hover:scale-[1.02]">
      <h2 className="text-lg font-semibold text-datadenkt-white mb-2">Financiële waarschuwingen</h2>
      {loading && <p className="text-datadenkt-white/60 text-sm">Laden…</p>}
      {!loading && warnings.length === 0 && <p className="text-datadenkt-white/60 text-sm">Geen waarschuwingen</p>}
      {!loading && warnings.length > 0 && (
        <ul className="list-disc list-inside text-sm text-datadenkt-orange space-y-1">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DashboardProductivityWidget() {
  const supabase = getSupabaseClient()
  const [ratio, setRatio] = useState<number | null>(null)
  const [trend, setTrend] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function run() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return
      const now = new Date()
      const thisWeekStart = new Date(now)
      thisWeekStart.setDate(now.getDate() - 7)
      const lastWeekStart = new Date(now)
      lastWeekStart.setDate(now.getDate() - 14)
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thisWeekStart.toISOString())
      if (!mounted) return
      const list = (tasks ?? []) as { status: string; created_at: string }[]
      const created = list.length
      const completed = list.filter((t) => t.status === 'DONE').length
      setRatio(created > 0 ? Math.round((completed / created) * 100) : 0)
      setTrend(created > 0 ? '' : 'Geen data deze week')
      setLoading(false)
    }
    run()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="card-primary p-6 hover:scale-[1.02]">
      <h2 className="text-lg font-semibold text-datadenkt-white mb-2">Productiviteitsmeter</h2>
      {loading && <p className="text-datadenkt-white/60 text-sm">Laden…</p>}
      {!loading && (
        <p className="text-datadenkt-white/90">
          {ratio != null ? `${ratio}% afgerond (deze week)` : '—'} {trend && ` · ${trend}`}
        </p>
      )}
    </div>
  )
}

function DashboardDecisionLogWidget() {
  const supabase = getSupabaseClient()
  const [decisions, setDecisions] = useState<{ id: string; title: string; user_id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [adding, setAdding] = useState(false)
  const toast = useToast()

  const fetchDecisions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('tasks')
      .select('id, title, user_id')
      .eq('user_id', user.id)
      .like('title', '[DECISION]%')
      .order('created_at', { ascending: false })
      .limit(10)
    setDecisions((data ?? []) as { id: string; title: string; user_id: string }[])
  }, [])

  useEffect(() => {
    let mounted = true
    fetchDecisions().then(() => {
      if (mounted) setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [fetchDecisions])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAdding(true)
    const fullTitle = t.startsWith('[DECISION]') ? t : `[DECISION] ${t}`
    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: fullTitle,
      status: 'OPEN',
      details: why.trim() || null,
      priority: 'MEDIUM',
      tags: [],
    }).select('id, title, user_id').single()
    setAdding(false)
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast('Beslissing toegevoegd')
    setTitle('')
    setWhy('')
    fetchDecisions()
  }

  const handleDelete = async (id: string, userId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId)
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast('Beslissing verwijderd')
    fetchDecisions()
  }

  return (
    <div className="card-primary p-6 hover:scale-[1.02]">
      <h2 className="text-lg font-semibold text-datadenkt-white mb-3">Beslissingslogboek</h2>
      <form onSubmit={handleAdd} className="space-y-2 mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Beslissing"
          className="w-full rounded-xl border border-white/10 bg-datadenkt-navy-dark px-3 py-2 text-sm text-datadenkt-white placeholder:text-datadenkt-white/50 focus:border-datadenkt-teal focus:outline-none focus:ring-2 focus:ring-datadenkt-teal/50 disabled:opacity-50 transition-all duration-200"
          disabled={adding}
        />
        <input
          type="text"
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="Waarom (optioneel)"
          className="w-full rounded-xl border border-white/10 bg-datadenkt-navy-dark px-3 py-2 text-sm text-datadenkt-white placeholder:text-datadenkt-white/50 focus:border-datadenkt-teal focus:outline-none focus:ring-2 focus:ring-datadenkt-teal/50 disabled:opacity-50 transition-all duration-200"
          disabled={adding}
        />
        <button type="submit" disabled={adding || !title.trim()} className="btn-accent px-3 py-1.5 text-sm disabled:opacity-50">
          {adding ? 'Bezig…' : 'Toevoegen'}
        </button>
      </form>
      {loading && <p className="text-datadenkt-white/60 text-sm">Laden…</p>}
      {!loading && decisions.length === 0 && <p className="text-datadenkt-white/60 text-sm">Geen beslissingen</p>}
      {!loading && decisions.length > 0 && (
        <ul className="space-y-1 text-sm">
          {decisions.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2">
              <span className="truncate text-datadenkt-white/90">{d.title.replace(/^\[DECISION\]\s*/, '')}</span>
              <button type="button" onClick={() => handleDelete(d.id, d.user_id)} className="text-datadenkt-white/60 hover:text-red-400 shrink-0 transition-colors">Verwijderen</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
