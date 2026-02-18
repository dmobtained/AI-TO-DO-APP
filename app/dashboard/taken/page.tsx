'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/browser'
import { useAuth } from '@/context/AuthProvider'
import { useToast } from '@/context/ToastContext'
import { FeatureGuard } from '@/components/FeatureGuard'

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
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    case 'LOW':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

function deadlineBadgeClass(dueDate: string | null): string {
  if (!dueDate) return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  return isOverdue(dueDate) ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default function TakenPage() {
  const router = useRouter()
  const toast = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const { user, loading: authLoading } = useAuth()

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
      <div className="mx-auto max-w-6xl">
        <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="mt-4 h-4 w-64 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
    )
  }

  return (
    <FeatureGuard feature="dashboard_tasks_list">
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Taken</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Beheer je taken en deadlines</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          {showForm ? 'Sluiten' : 'Nieuwe taak'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          value={openCount}
          label="Open taken"
        />
        <StatCard
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          value={todayCount}
          label="Taken vandaag"
        />
        <StatCard
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          value={overdueCount}
          label="Overdue"
        />
      </div>

      {showForm && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm p-6 mb-6">
          <form onSubmit={handleAdd} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Titel *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value)}
                placeholder="Taak titel"
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400 dark:bg-slate-700 dark:text-slate-100"
                disabled={adding}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Details</label>
              <textarea
                value={form.details}
                onChange={(e) => updateForm('details', e.target.value)}
                placeholder="Optioneel"
                rows={3}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y placeholder:text-slate-400 dark:bg-slate-700 dark:text-slate-100"
                disabled={adding}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Prioriteit</label>
                <select
                  value={form.priority}
                  onChange={(e) => updateForm('priority', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-100"
                  disabled={adding}
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deadline</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => updateForm('due_date', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-100"
                  disabled={adding}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Context</label>
                <select
                  value={form.context}
                  onChange={(e) => updateForm('context', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-100"
                  disabled={adding}
                >
                  <option value="">—</option>
                  {CONTEXT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Geschatte tijd (min)</label>
                <input
                  type="number"
                  min={1}
                  value={form.estimated_time}
                  onChange={(e) => updateForm('estimated_time', e.target.value)}
                  placeholder="bijv. 30"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 dark:bg-slate-700 dark:text-slate-100"
                  disabled={adding}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Energie</label>
              <select
                value={form.energy_level}
                onChange={(e) => updateForm('energy_level', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:max-w-[12rem] dark:bg-slate-700 dark:text-slate-100"
                disabled={adding}
              >
                {ENERGY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={adding || !form.title.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {adding ? 'Bezig…' : 'Toevoegen'}
              </button>
              <button
                type="button"
                onClick={() => { setForm(emptyForm); setShowForm(false) }}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Alle taken</h2>
          </div>
          {loading ? (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {[1, 2, 3].map((i) => (
                <li key={i} className="px-6 py-4">
                  <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-600 animate-pulse" />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {tasks.length === 0 ? (
                <li className="px-6 py-12 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Geen taken. Klik op &quot;Nieuwe taak&quot; om er een toe te voegen.</p>
                </li>
              ) : (
                tasks.map((task) => {
                  const overdue = task.status === 'OPEN' && isOverdue(task.due_date)
                  const highPriority = task.priority === 'HIGH'
                  return (
                    <li
                      key={task.id}
                      className={`px-6 py-4 transition hover:shadow-md ${overdue ? 'bg-red-50 dark:bg-red-900/10' : ''} ${highPriority ? 'border-l-4 border-red-500' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          onClick={() => handleToggle(task)}
                          className={`shrink-0 mt-0.5 flex items-center justify-center w-5 h-5 rounded-md border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                            task.status === 'DONE' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 hover:border-slate-400'
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
                          <span
                            className={
                              task.status === 'DONE'
                                ? 'text-slate-500 dark:text-slate-400 line-through font-semibold'
                                : 'text-slate-900 dark:text-slate-100 font-semibold'
                            }
                          >
                            {task.title}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {task.priority && (
                              <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(task.priority)}`}>
                                {task.priority === 'HIGH' ? 'Hoog' : task.priority === 'MEDIUM' ? 'Normaal' : 'Laag'}
                              </span>
                            )}
                            {task.due_date && (
                              <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${deadlineBadgeClass(task.due_date)}`}>
                                {isOverdue(task.due_date) ? 'Overdue · ' : ''}{formatDueDate(task.due_date)}
                              </span>
                            )}
                            {task.context && <span>{task.context}</span>}
                            {task.estimated_time != null && task.estimated_time > 0 && <span>~{task.estimated_time} min</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(task.id)}
                          className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                          aria-label="Verwijderen"
                        >
                          Verwijderen
                        </button>
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Snelle links</h2>
          <Link href="/dashboard" className="block text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-2">← Dashboard</Link>
          <Link href="/dashboard/financien" className="block text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Financiën →</Link>
        </div>
      </div>
    </div>
    </FeatureGuard>
  )
}
