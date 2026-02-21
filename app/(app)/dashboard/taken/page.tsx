"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { useToast } from '@/context/ToastContext'
import { FeatureGuard } from '@/components/FeatureGuard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageContainer } from '@/components/ui/PageContainer'

type TaskStatus = 'OPEN' | 'DONE'
type Priority = 'LOW' | 'MEDIUM' | 'HIGH'
type ContextOption = 'werk' | 'privé' | 'studie'

type Task = {
  id: string
  title: string
  status: TaskStatus
  created_at: string
  user_id: string
  details: string | null
  priority: string | null
  due_date: string | null
  tags: string[] | null
  context: string | null
  estimated_time: number | null
  energy_level: string | null
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'LOW', label: 'Laag' },
  { value: 'MEDIUM', label: 'Normaal' },
  { value: 'HIGH', label: 'Hoog' },
]

const CONTEXT_OPTIONS: { value: ContextOption; label: string }[] = [
  { value: 'werk', label: 'Werk' },
  { value: 'privé', label: 'Privé' },
  { value: 'studie', label: 'Studie' },
]

const ENERGY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'LOW', label: 'Laag' },
  { value: 'MEDIUM', label: 'Normaal' },
  { value: 'HIGH', label: 'Hoog' },
]

const emptyForm = {
  title: '',
  details: '',
  priority: 'MEDIUM' as Priority,
  due_date: '',
  context: '' as ContextOption | '',
  estimated_time: '',
  energy_level: 'MEDIUM' as Priority,
}

function formatDueDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false
  const due = new Date(iso)
  due.setHours(23, 59, 59, 999)
  return due < new Date() && iso !== null
}

function isDueToday(iso: string | null): boolean {
  if (!iso) return false
  const d = new Date(iso)
  const today = new Date()
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
}

function priorityBadgeClass(priority: string | null): string {
  switch (priority) {
    case 'HIGH':
      return 'bg-danger/10 text-danger border-danger/30'
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-600 border-amber-200'
    case 'LOW':
      return 'bg-hover text-textSecondary border-border'
    default:
      return 'bg-hover text-textSecondary border-border'
  }
}

function deadlineBadgeClass(dueDate: string | null): string {
  if (!dueDate) return 'bg-hover text-textSecondary border-border'
  return isOverdue(dueDate) ? 'bg-danger/10 text-danger border-danger/30' : 'bg-hover text-textSecondary border-border'
}

export default function TakenPage() {
  const supabase = getSupabaseClient()
  const router = useRouter()
  const toast = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const { user, loading: authLoading } = useDashboardUser()

  const fetchTasks = useCallback(async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) {
        router.replace('/')
        return
      }
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, created_at, user_id, details, priority, due_date, tags, context, estimated_time, energy_level')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
      if (error) {
        setTasks([])
        return
      }
      setTasks((data ?? []) as Task[])
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/')
      return
    }
    fetchTasks()
  }, [user, authLoading, router, fetchTasks])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return
    setAdding(true)
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) {
        router.replace('/')
        return
      }
      const payload = {
        title,
        status: 'OPEN' as TaskStatus,
        user_id: u.id,
        details: form.details.trim() || null,
        priority: form.priority,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        tags: [],
        context: form.context || null,
        estimated_time: form.estimated_time ? parseInt(form.estimated_time, 10) : null,
        energy_level: form.energy_level,
      }
      const { data, error } = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .single()
      if (error) {
        toast(error.message, 'error')
        return
      }
      setTasks((prev) => [data as Task, ...prev])
      setForm(emptyForm)
      setShowForm(false)
      toast('Taak toegevoegd')
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'OPEN' ? 'DONE' : 'OPEN'
    const { error } = await supabase.from('tasks').update({ status: nextStatus }).eq('id', task.id).eq('user_id', task.user_id)
    if (error) {
      toast(error.message, 'error')
      return
    }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)))
    toast(nextStatus === 'DONE' ? 'Taak afgerond' : 'Taak geopend')
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', user!.id)
    if (error) {
      toast(error.message, 'error')
      return
    }
    setTasks((prev) => prev.filter((t) => t.id !== id))
    toast('Taak verwijderd')
  }

  const updateForm = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const openCount = tasks.filter((t) => t.status === 'OPEN').length
  const todayCount = tasks.filter((t) => t.status === 'OPEN' && isDueToday(t.due_date)).length
  const overdueCount = tasks.filter((t) => t.status === 'OPEN' && isOverdue(t.due_date)).length

  if (authLoading || !user) {
    return (
      <PageContainer>
        <div className="h-8 w-48 rounded bg-hover animate-pulse" />
        <div className="mt-4 h-4 w-64 rounded bg-hover animate-pulse" />
      </PageContainer>
    )
  }

  return (
    <FeatureGuard feature="dashboard_tasks_list">
    <PageContainer>
      <SectionHeader
        title="Taken"
        subtitle="Beheer je taken en deadlines"
        action={
          <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Sluiten' : 'Nieuwe taak'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Open taken" value={openCount} />
        <StatCard title="Taken vandaag" value={todayCount} />
        <StatCard title="Overdue" value={overdueCount} variant={overdueCount > 0 ? 'danger' : 'default'} />
      </div>

      {showForm && (
        <Card className="p-6 mb-6">
          <CardContent className="p-0">
            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1.5">Titel *</label>
                <Input type="text" value={form.title} onChange={(e) => updateForm('title', e.target.value)} placeholder="Taak titel" required disabled={adding} />
              </div>
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1.5">Details</label>
                <textarea value={form.details} onChange={(e) => updateForm('details', e.target.value)} placeholder="Optioneel" rows={3} className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-textPrimary placeholder:text-textSecondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y" disabled={adding} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1.5">Prioriteit</label>
                  <select value={form.priority} onChange={(e) => updateForm('priority', e.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-textPrimary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" disabled={adding}>
                    {PRIORITY_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1.5">Deadline</label>
                  <Input type="date" value={form.due_date} onChange={(e) => updateForm('due_date', e.target.value)} disabled={adding} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1.5">Context</label>
                  <select value={form.context} onChange={(e) => updateForm('context', e.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-textPrimary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" disabled={adding}>
                    <option value="">—</option>
                    {CONTEXT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1.5">Geschatte tijd (min)</label>
                  <Input type="number" min={1} value={form.estimated_time} onChange={(e) => updateForm('estimated_time', e.target.value)} placeholder="bijv. 30" disabled={adding} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1.5">Energie</label>
                <select value={form.energy_level} onChange={(e) => updateForm('energy_level', e.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-textPrimary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-[12rem]" disabled={adding}>
                  {ENERGY_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={adding || !form.title.trim()}>{adding ? 'Bezig…' : 'Toevoegen'}</Button>
                <Button type="button" variant="secondary" onClick={() => { setForm(emptyForm); setShowForm(false) }}>Annuleren</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 overflow-hidden">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-textPrimary">Alle taken</CardTitle>
          </CardHeader>
          {loading ? (
            <ul className="divide-y divide-[#e5e7eb]">
              {[1, 2, 3].map((i) => (
                <li key={i} className="px-6 py-4">
                  <div className="h-5 w-3/4 rounded bg-hover animate-pulse" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-hover animate-pulse" />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-[#e5e7eb]">
              {tasks.length === 0 ? (
                <li className="px-6 py-12 text-center">
                  <p className="text-sm text-textSecondary">Geen taken. Klik op &quot;Nieuwe taak&quot; om er een toe te voegen.</p>
                </li>
              ) : (
                tasks.map((task) => {
                  const overdue = task.status === 'OPEN' && isOverdue(task.due_date)
                  return (
                    <li
                      key={task.id}
                      className={`px-6 py-4 transition-all duration-200 hover:bg-hover border-l-4 ${overdue ? 'border-danger bg-danger/10' : 'border-primary'}`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          onClick={() => handleToggle(task)}
                          className={`shrink-0 mt-0.5 flex items-center justify-center min-w-[44px] min-h-[44px] w-5 h-5 rounded-md border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                            task.status === 'DONE' ? 'border-primary bg-primary' : 'border-border bg-card hover:border-primary'
                          }`}
                          aria-label={task.status === 'DONE' ? 'Open zetten' : 'Afvinken'}
                        >
                          {task.status === 'DONE' && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12" aria-hidden>
                              <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className={task.status === 'DONE' ? 'text-textSecondary line-through font-semibold' : 'text-textPrimary font-semibold'}>
                            {task.title}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-textSecondary">
                            {task.priority && (
                              <span className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(task.priority)}`}>
                                {task.priority === 'HIGH' ? 'Hoog' : task.priority === 'MEDIUM' ? 'Normaal' : 'Laag'}
                              </span>
                            )}
                            {task.due_date && (
                              <span className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium ${deadlineBadgeClass(task.due_date)}`}>
                                {isOverdue(task.due_date) ? 'Overdue · ' : ''}{formatDueDate(task.due_date)}
                              </span>
                            )}
                            {task.context && <span>{task.context}</span>}
                            {task.estimated_time != null && task.estimated_time > 0 && <span>~{task.estimated_time} min</span>}
                          </div>
                        </div>
                        <button type="button" onClick={() => handleDelete(task.id)} className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-textSecondary hover:bg-danger/10 hover:text-danger transition-colors" aria-label="Verwijderen">
                          Verwijderen
                        </button>
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold text-textPrimary mb-2">Snelle links</h2>
          <Link href="/dashboard" className="block text-sm text-primary hover:underline mb-2">← Dashboard</Link>
          <Link href="/dashboard/financien" className="block text-sm text-primary hover:underline">Financiën →</Link>
        </Card>
      </div>
    </PageContainer>
    </FeatureGuard>
  )
}
