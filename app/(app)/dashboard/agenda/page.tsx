'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { PageContainer } from '@/components/ui/PageContainer'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar as CalendarIcon, Plus, X, Upload } from 'lucide-react'

type RosterRow = { start: string; end: string | null; title: string }

/** Parse datum naar YYYY-MM-DD. Ondersteunt o.a. DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY. */
function parseDateString(s: string): string | null {
  const raw = s.trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const dmy = raw.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    const day = d!.padStart(2, '0')
    const month = m!.padStart(2, '0')
    return `${y}-${month}-${day}`
  }
  const ydm = raw.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/)
  if (ydm) {
    const [, y, m, d] = ydm
    return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`
  }
  return null
}

function looksLikeDate(s: string): boolean {
  return /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/.test(s.trim()) || /^\d{4}-\d{2}-\d{2}$/.test(s.trim())
}

/** Parse CSV voor werkrooster. Formaat: datum;titel OF begindatum;einddatum;titel. Scheiding ; of , */
function parseRosterCsv(text: string): RosterRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const rows: RosterRow[] = []
  for (const line of lines) {
    const sep = line.includes(';') ? ';' : ','
    const parts = line.split(sep).map((p) => p.trim().replace(/^["']|["']$/g, ''))
    if (parts.length < 2) continue
    const start = parseDateString(parts[0] ?? '')
    if (!start) continue
    let end: string | null = null
    let title: string
    if (parts.length >= 3 && looksLikeDate(parts[1] ?? '')) {
      end = parseDateString(parts[1] ?? '') || null
      title = (parts[2] ?? '').trim() || 'Werk'
    } else {
      title = (parts[1] ?? '').trim() || 'Werk'
    }
    if (end && end < start) end = null
    rows.push({ start, end, title })
  }
  return rows
}

type Task = {
  id: string
  title: string
  status: string
  due_date: string
  created_at: string
  user_id: string
}

type AgendaEvent = {
  id: string
  title: string
  event_date: string
  event_date_end: string | null
  color: string
  created_at: string
  user_id: string
}

const EVENT_COLORS = [
  { value: 'blue', label: 'Blauw', bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-white' },
  { value: 'green', label: 'Groen', bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-white' },
  { value: 'orange', label: 'Oranje', bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-white' },
  { value: 'red', label: 'Rood', bg: 'bg-red-500', border: 'border-red-500', text: 'text-white' },
  { value: 'purple', label: 'Paars', bg: 'bg-violet-500', border: 'border-violet-500', text: 'text-white' },
  { value: 'gray', label: 'Grijs', bg: 'bg-slate-500', border: 'border-slate-500', text: 'text-white' },
] as const

function getColorClass(color: string): string {
  const found = EVENT_COLORS.find((c) => c.value === color)
  return found ? `${found.bg} ${found.text}` : 'bg-primary text-white'
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

/** Alle datums van start t/m eind (inclusief). Als eind null of voor start: alleen start. */
function getDateRange(start: string, end: string | null): string[] {
  const startD = new Date(start)
  const endD = end && end >= start ? new Date(end) : startD
  if (endD < startD) return [start]
  const out: string[] = []
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

type DayItem = { type: 'task'; task: Task } | { type: 'event'; event: AgendaEvent }

export default function AgendaPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useDashboardUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(() => new Date())
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [newDateEnd, setNewDateEnd] = useState('')
  const [newColor, setNewColor] = useState<string>('blue')
  const [saving, setSaving] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [rosterPreview, setRosterPreview] = useState<RosterRow[]>([])
  const [importColor, setImportColor] = useState<string>('orange')
  const [importError, setImportError] = useState<string>('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const fetchEvents = useCallback(async () => {
    if (!user?.id) return
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('agenda_events')
      .select('id, title, event_date, event_date_end, color, created_at, user_id')
      .eq('user_id', user.id)
      .order('event_date', { ascending: true })
    if (error) {
      setEvents([])
      return
    }
    setEvents((data ?? []) as AgendaEvent[])
  }, [user?.id])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/')
      return
    }
    setLoading(true)
    Promise.all([fetchTasks(), fetchEvents()]).finally(() => setLoading(false))
  }, [user, authLoading, router, fetchTasks, fetchEvents])

  const itemsByDay: Record<string, DayItem[]> = {}
  for (const t of tasks) {
    const key = t.due_date ? t.due_date.slice(0, 10) : ''
    if (!key) continue
    if (!itemsByDay[key]) itemsByDay[key] = []
    itemsByDay[key].push({ type: 'task', task: t })
  }
  for (const e of events) {
    const start = e.event_date?.slice(0, 10) ?? ''
    if (!start) continue
    const end = e.event_date_end?.slice(0, 10) || null
    const dates = getDateRange(start, end)
    for (const key of dates) {
      if (!itemsByDay[key]) itemsByDay[key] = []
      itemsByDay[key].push({ type: 'event', event: e })
    }
  }
  for (const key of Object.keys(itemsByDay)) {
    itemsByDay[key].sort((a, b) => {
      const at = a.type === 'task' ? a.task.created_at : a.event.created_at
      const bt = b.type === 'task' ? b.task.created_at : b.event.created_at
      const aStr = at ?? ''
      const bStr = bt ?? ''
      return aStr.localeCompare(bStr)
    })
  }

  const monthDays = getMonthDays(year, month)
  const firstWeekday = new Date(year, month, 1).getDay()
  const startPadding = firstWeekday === 0 ? 6 : firstWeekday - 1

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !newTitle.trim()) return
    const end = newDateEnd && newDateEnd >= newDate ? newDateEnd : null
    setSaving(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('agenda_events').insert({
      user_id: user.id,
      title: newTitle.trim(),
      event_date: newDate,
      event_date_end: end,
      color: newColor,
    })
    setSaving(false)
    if (error) return
    setNewTitle('')
    setNewDate(new Date().toISOString().slice(0, 10))
    setNewDateEnd('')
    setNewColor('blue')
    setShowAddForm(false)
    fetchEvents()
  }

  const handleDeleteEvent = async (id: string) => {
    if (!user?.id) return
    const supabase = getSupabaseClient()
    await supabase.from('agenda_events').delete().eq('id', id).eq('user_id', user.id)
    fetchEvents()
  }

  const handleRosterFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('')
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const rows = parseRosterCsv(text)
      if (rows.length === 0) {
        setImportError('Geen geldige regels gevonden. Gebruik formaat: datum;titel of begindatum;einddatum;titel (scheiding ; of ,)')
        setRosterPreview([])
      } else {
        setRosterPreview(rows)
      }
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const handleImportRoster = async () => {
    if (!user?.id || rosterPreview.length === 0) return
    setImporting(true)
    const supabase = getSupabaseClient()
    const toInsert = rosterPreview.map((r) => ({
      user_id: user.id,
      title: r.title,
      event_date: r.start,
      event_date_end: r.end,
      color: importColor,
    }))
    const { error } = await supabase.from('agenda_events').insert(toInsert)
    setImporting(false)
    if (error) {
      setImportError(error.message)
      return
    }
    setRosterPreview([])
    setShowImport(false)
    fetchEvents()
  }

  if (authLoading || !user) {
    return (
      <PageContainer>
        <div className="h-8 w-48 rounded bg-hover animate-pulse" />
      </PageContainer>
    )
  }

  const hasAnyItems = tasks.length > 0 || events.length > 0

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionHeader
          title="Agenda"
          subtitle="Taken met deadline en eigen activiteiten met datum en kleur"
        />
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowAddForm((v) => !v)}
          >
            <Plus className="h-4 w-4 mr-2" /> Activiteit toevoegen
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowImport((v) => !v)
              if (!showImport) setRosterPreview([]); setImportError('')
            }}
          >
            <Upload className="h-4 w-4 mr-2" /> Werkrooster importeren
          </Button>
        </div>
      </div>

      {showImport && (
        <Card className="mt-6 p-6">
          <h3 className="text-lg font-semibold text-textPrimary mb-2">Werkrooster importeren</h3>
          <p className="text-sm text-textSecondary mb-4">
            Upload een CSV-bestand. Formaat: <strong>datum;titel</strong> of <strong>begindatum;einddatum;titel</strong>. Scheiding met ; of ,. Datum bv. 25-02-2025 of 2025-02-25.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleRosterFile}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            className="mb-4"
          >
            Bestand kiezen
          </Button>
          {importError && (
            <p className="text-sm text-danger mb-2">{importError}</p>
          )}
          {rosterPreview.length > 0 && (
            <>
              <p className="text-sm text-textPrimary mb-2">
                <strong>{rosterPreview.length}</strong> activiteiten gevonden. Kies een kleur en importeer.
              </p>
              <div className="overflow-x-auto max-h-48 overflow-y-auto border border-border rounded-[10px] mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-hover sticky top-0">
                    <tr>
                      <th className="text-left p-2">Begindatum</th>
                      <th className="text-left p-2">Einddatum</th>
                      <th className="text-left p-2">Titel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterPreview.slice(0, 15).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2 text-textPrimary">{r.start}</td>
                        <td className="p-2 text-textSecondary">{r.end ?? '—'}</td>
                        <td className="p-2 text-textPrimary">{r.title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rosterPreview.length > 15 && (
                <p className="text-xs text-textSecondary mb-2">… en {rosterPreview.length - 15} meer</p>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-textSecondary mb-2">Kleur voor geïmporteerde activiteiten</label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setImportColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${c.bg} ${
                        importColor === c.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleImportRoster} disabled={importing}>
                  {importing ? 'Bezig…' : `${rosterPreview.length} activiteiten importeren`}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowImport(false)}>
                  Annuleren
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {showAddForm && (
        <Card className="mt-6 p-6">
          <h3 className="text-lg font-semibold text-textPrimary mb-4">Nieuwe activiteit</h3>
          <form onSubmit={handleAddEvent} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Titel</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Bijv. Vergadering, Afspraak..."
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Begindatum</label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Einddatum (optioneel)</label>
                <Input
                  type="date"
                  value={newDateEnd}
                  onChange={(e) => setNewDateEnd(e.target.value)}
                  min={newDate}
                  placeholder="Zelfde dag als leeg"
                />
                <p className="text-xs text-textSecondary mt-1">Laat leeg voor één dag; vul in voor bv. vakantie</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Kleur (soort activiteit)</label>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setNewColor(c.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${c.bg} ${
                      newColor === c.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
              <p className="text-xs text-textSecondary mt-1">Kies een kleur om het type activiteit aan te geven</p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !newTitle.trim()}>
                {saving ? 'Opslaan…' : 'Toevoegen'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>
                Annuleren
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-6 flex items-center gap-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
        >
          Vorige
        </Button>
        <span className="text-lg font-semibold text-textPrimary capitalize">{monthLabel}</span>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
        >
          Volgende
        </Button>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-border bg-card text-center text-xs font-medium text-textSecondary">
            {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((d) => (
              <div key={d} className="border-r border-border py-2 last:border-r-0">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: startPadding }, (_, i) => (
              <div key={`pad-${i}`} className="min-h-[72px] sm:min-h-[90px] border-b border-r border-border bg-hover/30" />
            ))}
            {monthDays.map((day) => {
              const key = formatDayKey(day)
              const dayItems = itemsByDay[key] ?? []
              const isToday =
                day.getFullYear() === new Date().getFullYear() &&
                day.getMonth() === new Date().getMonth() &&
                day.getDate() === new Date().getDate()
              return (
                <div
                  key={key}
                  className={`min-h-[72px] sm:min-h-[90px] border-b border-r border-border p-1.5 last:border-r-0 ${
                    isToday ? 'bg-primarySoft/50' : 'bg-card'
                  }`}
                >
                  <span className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-textPrimary'}`}>
                    {day.getDate()}
                  </span>
                  <ul className="mt-1 space-y-0.5">
                    {dayItems.slice(0, 4).map((item) => {
                      if (item.type === 'task') {
                        const t = item.task
                        return (
                          <li
                            key={`t-${t.id}`}
                            className={`truncate rounded px-1.5 py-0.5 text-xs ${
                              t.status === 'DONE'
                                ? 'bg-hover text-textSecondary line-through'
                                : 'bg-hover text-textPrimary border-l-2 border-primary'
                            }`}
                            title={t.title}
                          >
                            {t.title}
                          </li>
                        )
                      }
                      const ev = item.event
                      return (
                        <li
                          key={`e-${ev.id}`}
                          className={`group truncate rounded px-1.5 py-0.5 text-xs ${getColorClass(ev.color)} flex items-center justify-between gap-0.5`}
                          title={ev.title}
                        >
                          <span className="truncate min-w-0">{ev.title}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 min-w-[44px] min-h-[44px] rounded hover:bg-white/20 shrink-0 touch-manipulation flex items-center justify-center"
                            aria-label="Verwijderen"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      )
                    })}
                    {dayItems.length > 4 && (
                      <li className="text-xs text-textSecondary pl-1">+{dayItems.length - 4}</li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {!loading && !hasAnyItems && (
        <EmptyState
          icon={CalendarIcon}
          title="Nog geen activiteiten"
          description="Voeg een activiteit toe met datum en kleur, of geef bij Taken een deadline om ze hier te zien."
          className="mt-8"
        />
      )}
    </PageContainer>
  )
}
