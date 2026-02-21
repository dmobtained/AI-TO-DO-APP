"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useDashboard } from '@/context/DashboardContext'
import { useToast } from '@/context/ToastContext'
import { logActivity } from '@/lib/audit'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ListTodo, Mail, Wallet, Settings, Cloud, Briefcase, Target, ChevronDown, ChevronUp, Calendar, Car } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StatCard } from '@/components/ui/StatCard'
import { PageContainer } from '@/components/ui/PageContainer'

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
  const { canSee, profileName } = useDashboard()
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
  const [quickAmount, setQuickAmount] = useState('')
  const [quickListToday, setQuickListToday] = useState<{ id: string; amount: number; date: string }[]>([])
  const [weather, setWeather] = useState<{ temp?: number; icon?: string; max?: number; min?: number; rain?: number } | null>(null)

  const [overviewError, setOverviewError] = useState<string | null>(null)

  const fetchOverview = useCallback(async (userId: string) => {
    setOverviewError(null)
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

    if (tasksRes.error) {
      toast(tasksRes.error.message || 'Taken laden mislukt', 'error')
      setOverviewError(tasksRes.error.message || 'Taken laden mislukt')
      setOpenTasks([])
      setFocusTasks([])
      return
    }
    if (financeRes.error) {
      toast(financeRes.error.message || 'Financiën laden mislukt', 'error')
      setIncomeMonth(0)
      setExpenseMonth(0)
    }

    const tasks = (tasksRes.data ?? []) as Task[]
    const todayCount = tasks.filter(
      (t) => isSameDay(t.due_date, today) || (t.created_at >= todayStr && t.created_at < tomorrowStr)
    ).length
    setOpenTasksToday(todayCount)

    if (!financeRes.error) {
      let inM = 0
      let exM = 0
      ;(financeRes.data ?? []).forEach((row: { type: string; amount: string }) => {
        const n = Number(row.amount) || 0
        if (row.type === 'income') inM += n
        else exM += n
      })
      setIncomeMonth(inM)
      setExpenseMonth(exM)
    }

    const sortedForFocus = [...tasks].sort((a, b) => {
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity
      if (aDue !== bDue) return aDue - bDue
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    setFocusTasks(sortedForFocus.slice(0, 3))
    setOpenTasks(tasks.slice(0, 8))
  }, [toast])

  const DASHBOARD_FETCH_TIMEOUT_MS = 15000

  useEffect(() => {
    let mounted = true
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
          setTimeout(() => reject(new Error('Timeout')), DASHBOARD_FETCH_TIMEOUT_MS)
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
      const res = await fetch('/api/ai/daynote', { method: 'POST', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      const message = typeof data?.error === 'string' ? data.error : undefined

      if (!res.ok) {
        setDaynoteStatus('error')
        const friendlyMessage =
          res.status === 503
            ? 'AI Hub-webhook is niet geconfigureerd. Zet N8N_AI_HUB_WEBHOOK in .env.local of Railway.'
            : res.status === 504
              ? 'Verzoek duurde te lang. Probeer het later opnieuw.'
              : message ?? `Fout: ${res.status}`
        setDaynoteError(friendlyMessage)
        toast(friendlyMessage, 'error')
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
  const salarisMaand = incomeMonth
  const nettoVrij = freeToSpend
  const pctOver = incomeMonth > 0 ? Math.round((freeToSpend / incomeMonth) * 100) : 0
  const budget7Dagen = incomeMonth > 0 ? (incomeMonth / 30) * 7 : 0
  const budget7Progress = budget7Dagen > 0 ? Math.min(100, (expenseMonth / (budget7Dagen * (30 / 7))) * 100) : 0

  useEffect(() => {
    let mounted = true
    fetch('https://api.open-meteo.com/v1/forecast?latitude=52.37&longitude=4.89&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe/Amsterdam')
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return
        setWeather({
          temp: d.current?.temperature_2m,
          icon: d.current?.weather_code != null ? String(d.current.weather_code) : undefined,
          max: d.daily?.temperature_2m_max?.[0],
          min: d.daily?.temperature_2m_min?.[0],
          rain: d.daily?.precipitation_probability_max?.[0],
        })
      })
      .catch(() => {
        if (mounted) {
          setWeather({})
          toast('Weer niet beschikbaar', 'error')
        }
      })
    return () => { mounted = false }
  }, [])

  const fetchQuickListToday = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('finance_entries')
      .select('id, amount, entry_date')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .eq('title', 'Snelle uitgave')
      .eq('entry_date', today)
      .order('created_at', { ascending: false })
    const list = (data ?? []).map((r: { id: string; amount: string; entry_date: string }) => ({
      id: r.id,
      amount: Number(r.amount) || 0,
      date: r.entry_date,
    }))
    setQuickListToday(list)
  }, [])

  useEffect(() => {
    let mounted = true
    fetchQuickListToday().then(() => { if (!mounted) return })
    return () => { mounted = false }
  }, [fetchQuickListToday])

  const handleQuickExpenseAdd = useCallback(async () => {
    const amount = parseFloat(quickAmount.replace(',', '.'))
    if (Number.isNaN(amount) || amount <= 0) {
      toast('Voer een geldig bedrag in', 'error')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast('Niet ingelogd', 'error')
      return
    }
    const date = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('finance_entries').insert({
      user_id: user.id,
      type: 'expense',
      title: 'Snelle uitgave',
      amount: String(amount),
      entry_date: date,
    })
    if (error) {
      toast(error.message, 'error')
      return
    }
    setQuickAmount('')
    logActivity({ action: 'expense.quick_add', metadata: { amount, date } })
    toast('Uitgave toegevoegd')
    fetchQuickListToday()
  }, [quickAmount, toast, fetchQuickListToday])

  const welcomeText = profileName ? `Welkom terug ${profileName}` : 'Welkom terug'
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const alertBoxes: { href: string; label: string; icon: React.ElementType; count: string | number }[] = [
    { href: '/dashboard/taken', label: 'Openstaande taken', icon: ListTodo, count: loading ? '…' : openTasks.length },
    { href: '/dashboard/agenda', label: 'Vandaag', icon: Calendar, count: loading ? '…' : openTasksToday },
    { href: '/dashboard/financien', label: 'Financiën', icon: Wallet, count: '' },
    { href: '/dashboard/email', label: 'Mail', icon: Mail, count: '' },
    { href: '/auto', label: 'Auto', icon: Car, count: '' },
    { href: '/dashboard/instellingen', label: 'Instellingen', icon: Settings, count: '' },
  ]

  const handleRetryOverview = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setLoading(true)
      setOverviewError(null)
      await fetchOverview(user.id)
      setLoading(false)
    }
  }

  return (
    <PageContainer className="animate-fade-in space-y-6">
      <SectionHeader title="Dashboard" subtitle={welcomeText} />
      {overviewError && (
        <div className="rounded-[14px] border border-danger/30 bg-danger/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-danger">{overviewError}</p>
          <Button variant="secondary" onClick={handleRetryOverview} disabled={loading}>
            Opnieuw proberen
          </Button>
        </div>
      )}

      <Card className="p-5" hoverLift={false}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {alertBoxes.map(({ href, label, icon: Icon, count }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-[14px] border border-border bg-card p-4 text-center transition-all duration-[180ms] ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
            >
              <Icon className="h-8 w-8 shrink-0 text-primary" />
              <span className="text-sm font-medium text-textPrimary leading-tight">{label}</span>
              {count !== '' && (
                <span className="text-lg font-bold text-textPrimary tabular-nums">{count}</span>
              )}
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <h2 className="text-lg font-semibold text-textPrimary mb-4">Financiële kern</h2>
          <div className="space-y-2 text-sm">
            <p className="text-textSecondary">Salaris deze maand: <span className="font-medium text-textPrimary">{loading ? '—' : `€ ${salarisMaand.toFixed(2)}`}</span></p>
            <p className="text-textSecondary">Netto vrij bedrag: <span className="font-medium text-textPrimary">{loading ? '—' : `€ ${nettoVrij.toFixed(2)}`}</span></p>
            <p className="text-textSecondary">% over: <span className="font-medium text-textPrimary">{loading ? '—' : `${pctOver}%`}</span></p>
            <p className="text-textSecondary mt-2">7-dagen budget status</p>
            <div className="h-2.5 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-[600ms] ease-out" style={{ width: `${Math.min(100, budget7Progress)}%` }} />
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-textPrimary mb-4 flex items-center gap-2">
            <Cloud className="h-5 w-5 text-textSecondary" /> Weer
          </h2>
          {weather == null ? (
            <p className="text-sm text-textSecondary">Laden…</p>
          ) : (
            <div className="space-y-1 text-sm text-textSecondary">
              <p>Huidige temp: {weather.temp != null ? `${weather.temp} °C` : '—'}</p>
              <p>Max: {weather.max != null ? `${weather.max} °C` : '—'} · Min: {weather.min != null ? `${weather.min} °C` : '—'}</p>
              <p>Regenkans: {weather.rain != null ? `${weather.rain}%` : '—'}</p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="border-0 p-0">
            <CardTitle className="text-base text-textPrimary">Snelle uitgave</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Bedrag"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickExpenseAdd()}
              />
              <Button onClick={handleQuickExpenseAdd}>Toevoegen</Button>
            </div>
            {quickListToday.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-textSecondary">
                <span className="text-xs text-textSecondary">Vandaag:</span>
                {quickListToday.map((item) => (
                  <li key={item.id}>€ {item.amount.toFixed(2)}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-textPrimary mb-2">Weekbudget voortgang</h2>
          <div className="h-2.5 rounded-full bg-border overflow-hidden mt-2">
            <div className="h-full rounded-full bg-primary transition-all duration-[600ms] ease-out w-2/3" />
          </div>
          <p className="mt-2 text-sm text-textSecondary">Voor op schema</p>
        </Card>
        <StatCard title="Open taken vandaag" value={loading ? '—' : openTasksToday} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-textPrimary mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-textSecondary" /> Business pipeline
          </h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[14px] bg-hover border border-border p-3">
              <p className="text-2xl font-bold text-textPrimary">0</p>
              <p className="text-xs text-textSecondary">Leads</p>
            </div>
            <div className="rounded-[14px] bg-hover border border-border p-3">
              <p className="text-2xl font-bold text-textPrimary">0</p>
              <p className="text-xs text-textSecondary">Gesprek</p>
            </div>
            <div className="rounded-[14px] bg-hover border border-border p-3">
              <p className="text-2xl font-bold text-textPrimary">0</p>
              <p className="text-xs text-textSecondary">Deal</p>
            </div>
          </div>
        </Card>
        <Card className="xl:col-span-2">
          <h2 className="text-lg font-semibold text-textPrimary mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-textSecondary" /> Top 3 prioriteiten
          </h2>
          {loading ? (
            <ul className="divide-y divide-border">
              {[1, 2, 3].map((i) => (
                <li key={i} className="py-3"><div className="h-5 w-2/3 rounded bg-border animate-pulse" /></li>
              ))}
            </ul>
          ) : focusTasks.length === 0 ? (
            <p className="text-textSecondary text-sm">Geen prioriteiten.</p>
          ) : (
            <ul className="divide-y divide-border">
              {focusTasks.map((task) => (
                <li key={task.id} className="py-3 flex items-center gap-3 group">
                  <button type="button" onClick={() => handleToggleTask(task)} className="shrink-0 w-5 h-5 rounded-full border-2 border-border bg-card flex items-center justify-center hover:border-primary transition-all duration-150" aria-label="Afvinken">
                    {task.status === 'DONE' && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </button>
                  <Link href="/dashboard/taken" className="flex-1 min-w-0 truncate text-sm font-medium text-textPrimary hover:text-primary">{task.title}</Link>
                  <button type="button" onClick={() => handleDeleteTask(task.id, task.user_id)} className="shrink-0 text-xs text-textSecondary hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">Verwijderen</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card variant="hero">
        <CardTitle variant="hero" className="mb-4">Dagnotitie</CardTitle>
        <Button onClick={handleGenerateDaynote} disabled={daynoteStatus === 'loading'}>
          {daynoteStatus === 'loading' && (
            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          Genereer Dagnotitie
        </Button>
        {daynoteStatus === 'error' && daynoteError && (
          <p className="mt-3 text-sm text-danger">{daynoteError}</p>
        )}
        {daynoteStatus === 'success' && daynote && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-textSecondary mb-2">
              {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <pre className="text-sm text-textPrimary whitespace-pre-line font-sans bg-card p-4 rounded-[14px] border border-border">
              {daynote}
            </pre>
            <Button variant="secondary" className="mt-2" onClick={() => { void navigator.clipboard.writeText(daynote); toast('Gekopieerd naar klembord.') }}>
              Kopiëren
            </Button>
          </div>
        )}
      </Card>

      {canSee('dashboard_tasks_list') && (
        <Card hoverLift={false} className="overflow-hidden p-0">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-textPrimary">Deze taken moeten vandaag worden opgepakt</h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-[auto_1fr_2fr_auto] gap-4 px-5 py-3 border-b border-border">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="col-span-4 h-12 rounded bg-border animate-pulse" />
              ))}
            </div>
          ) : openTasks.length === 0 ? (
            <div className="px-6 py-8 text-center text-textSecondary text-sm">Geen open taken.</div>
          ) : (
            <>
              <div className="grid grid-cols-[auto_1fr_2fr_auto] gap-4 px-5 py-2 border-b border-border text-xs font-medium text-textSecondary uppercase tracking-wide">
                <span className="w-10" />
                <span>Datum</span>
                <span>Beschrijving</span>
                <span className="text-right">Acties</span>
              </div>
              <div className="divide-y divide-border">
                {openTasks.map((task, idx) => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status === 'OPEN'
                  const dueStr = task.due_date
                    ? new Date(task.due_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'
                  return (
                    <div
                      key={task.id}
                      className={`grid grid-cols-[auto_1fr_2fr_auto] gap-4 px-5 py-3 items-center group transition-colors duration-150 hover:bg-hover ${idx % 2 === 1 ? 'bg-hover/50' : ''}`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-hover">
                        <ListTodo className={`h-5 w-5 ${isOverdue ? 'text-amber-500' : 'text-primary'}`} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm text-textPrimary">{dueStr}</span>
                      </div>
                      <Link href="/dashboard/taken" className="min-w-0 block">
                        <span className="text-sm font-medium text-textPrimary group-hover:text-primary transition-colors line-clamp-1">{task.title}</span>
                        {task.details && <span className="text-xs text-textSecondary line-clamp-1 block mt-0.5">{task.details}</span>}
                      </Link>
                      <div className="flex items-center gap-2 justify-end">
                        <button type="button" onClick={() => handleToggleTask(task)} className="shrink-0 w-7 h-7 rounded-full border-2 border-border bg-card flex items-center justify-center hover:border-primary transition-all duration-150" aria-label="Afvinken">
                          {task.status === 'DONE' && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </button>
                        <button type="button" onClick={() => handleDeleteTask(task.id, task.user_id)} className="shrink-0 text-xs text-textSecondary hover:text-danger transition-colors opacity-0 group-hover:opacity-100">Verwijderen</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>
      )}

      {(canSee('cashflow_forecast') || canSee('financial_warnings') || canSee('productivity_meter') || canSee('decision_log')) && (
        <div>
          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-[14px] border border-border bg-card p-5 text-left transition-all duration-[180ms] hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="text-lg font-semibold text-textPrimary">Geavanceerde inzichten</span>
            {advancedOpen ? <ChevronUp className="h-5 w-5 text-textSecondary" /> : <ChevronDown className="h-5 w-5 text-textSecondary" />}
          </button>
          {advancedOpen && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {canSee('cashflow_forecast') && <DashboardCashflowWidget />}
              {canSee('financial_warnings') && <DashboardWarningsWidget />}
              {canSee('productivity_meter') && <DashboardProductivityWidget />}
              {canSee('decision_log') && <DashboardDecisionLogWidget />}
            </div>
          )}
        </div>
      )}
    </PageContainer>
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
    <Card>
      <h2 className="text-lg font-semibold text-textPrimary mb-2">Cashflow voorspelling</h2>
      {status === 'loading' && <p className="text-textSecondary text-sm">Laden…</p>}
      {status === 'nodata' && <p className="text-textSecondary text-sm">Nog onvoldoende data</p>}
      {status === 'data' && (
        <div className="space-y-1 text-sm text-primary">
          <p>7 dagen: € {Number(forecast7).toFixed(2)}</p>
          <p>30 dagen: € {Number(forecast30).toFixed(2)}</p>
        </div>
      )}
    </Card>
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
    <Card>
      <h2 className="text-lg font-semibold text-textPrimary mb-2">Financiële waarschuwingen</h2>
      {loading && <p className="text-textSecondary text-sm">Laden…</p>}
      {!loading && warnings.length === 0 && <p className="text-textSecondary text-sm">Geen waarschuwingen</p>}
      {!loading && warnings.length > 0 && (
        <ul className="list-disc list-inside text-sm text-amber-600 space-y-1">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </Card>
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
    <Card>
      <h2 className="text-lg font-semibold text-textPrimary mb-2">Productiviteitsmeter</h2>
      {loading && <p className="text-textSecondary text-sm">Laden…</p>}
      {!loading && (
        <p className="text-textPrimary">
          {ratio != null ? `${ratio}% afgerond (deze week)` : '—'} {trend && ` · ${trend}`}
        </p>
      )}
    </Card>
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
    <Card>
      <h2 className="text-lg font-semibold text-textPrimary mb-3">Beslissingslogboek</h2>
      <form onSubmit={handleAdd} className="space-y-2 mb-4">
        <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Beslissing" disabled={adding} />
        <Input type="text" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Waarom (optioneel)" disabled={adding} />
        <Button type="submit" disabled={adding || !title.trim()}>{adding ? 'Bezig…' : 'Toevoegen'}</Button>
      </form>
      {loading && <p className="text-textSecondary text-sm">Laden…</p>}
      {!loading && decisions.length === 0 && <p className="text-textSecondary text-sm">Geen beslissingen</p>}
      {!loading && decisions.length > 0 && (
        <ul className="space-y-1 text-sm">
          {decisions.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2">
              <span className="truncate text-textPrimary">{d.title.replace(/^\[DECISION\]\s*/, '')}</span>
              <button type="button" onClick={() => handleDelete(d.id, d.user_id)} className="text-textSecondary hover:text-danger shrink-0 transition-colors">Verwijderen</button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
