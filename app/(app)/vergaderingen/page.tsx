'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageContainer } from '@/components/ui/PageContainer'
import { useToast } from '@/context/ToastContext'
import { useModuleLock } from '@/hooks/useModuleLock'
import { ModuleLockBanner } from '@/components/modules/ModuleLockBanner'
import { logActivity } from '@/lib/audit'
import { Sparkles, Save, Plus, Check, Trash2 } from 'lucide-react'
import { ConfirmDeleteDialog } from '@/components/modules/ConfirmDeleteDialog'

type Note = { id: string; title?: string; content: string; summary: string | null; done?: boolean; updated_at: string }

export default function VergaderingenPage() {
  const toast = useToast()
  const [notities, setNotities] = useState('')
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [loadDone, setLoadDone] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const { locked: moduleLocked } = useModuleLock('meeting_notes')

  const loadNotes = useCallback(async () => {
    const res = await fetch('/api/meeting-notes', { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (res.ok && Array.isArray(data.notes)) {
      setNotes(data.notes)
      const latest = data.note ?? data.notes[0]
      if (latest) {
        setCurrentNote(latest)
        setNotities(latest.content ?? '')
        setSummary(latest.summary ?? null)
      } else {
        setCurrentNote(null)
        setNotities('')
        setSummary(null)
      }
    } else {
      setNotes([])
      setCurrentNote(null)
      setNotities('')
      setSummary(null)
    }
    setLoadDone(true)
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const handleSave = useCallback(async () => {
    setSaving(true)
    if (currentNote?.id) {
      const res = await fetch(`/api/meeting-notes/${currentNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: notities }),
      })
      const data = await res.json().catch(() => ({}))
      setSaving(false)
      if (!res.ok) {
        toast(data.error ?? 'Opslaan mislukt', 'error')
        return
      }
      setCurrentNote(data.note)
      setNotes((prev) => prev.map((n) => (n.id === data.note.id ? data.note : n)))
      toast('Opgeslagen')
    } else {
      const res = await fetch('/api/meeting-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: notities }),
      })
      const data = await res.json().catch(() => ({}))
      setSaving(false)
      if (!res.ok) {
        toast(data.error ?? 'Opslaan mislukt', 'error')
        return
      }
      setCurrentNote(data.note)
      setNotes((prev) => [data.note, ...prev])
      toast('Opgeslagen')
    }
  }, [currentNote, notities, toast])

  const handleToggleDone = useCallback(
    async (n: Note) => {
      if (moduleLocked) return
      const nextDone = !n.done
      const res = await fetch(`/api/meeting-notes/${n.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ done: nextDone }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast(data.error ?? 'Bijwerken mislukt', 'error')
        return
      }
      setNotes((prev) => prev.map((note) => (note.id === n.id ? { ...note, done: nextDone } : note)))
      if (currentNote?.id === n.id) setCurrentNote((c) => (c ? { ...c, done: nextDone } : null))
      toast(nextDone ? 'Afgevinkt' : 'Teruggezet')
    },
    [moduleLocked, currentNote, toast]
  )

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    const res = await fetch(`/api/meeting-notes/${deleteId}`, { method: 'DELETE', credentials: 'include' })
    setDeleteLoading(false)
    setDeleteId(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast(data.error ?? 'Verwijderen mislukt', 'error')
      return
    }
    setNotes((prev) => prev.filter((n) => n.id !== deleteId))
    if (currentNote?.id === deleteId) {
      setCurrentNote(null)
      setNotities('')
      setSummary(null)
    }
    toast('Verwijderd')
  }, [deleteId, currentNote, toast])

  const handleSummarize = useCallback(() => {
    setLoading(true)
    setSummary(null)
    logActivity({ action: 'meeting.summarize', entity_type: 'meeting' })
    setTimeout(() => {
      if (notities.trim().length > 0) {
        setSummary(
          'Demo-samenvatting: een echte AI-samenvatting kan later gekoppeld worden aan een webhook (bijv. N8N).\n\nKernpunten:\n• Notities worden opgeslagen.\n• Klik op "Opslaan" om je wijzigingen te bewaren.'
        )
      } else {
        setSummary('Voeg eerst notities toe en klik op Opslaan. Daarna kan AI een samenvatting genereren.')
      }
      setLoading(false)
    }, 600)
  }, [notities])

  if (!loadDone) {
    return (
      <PageContainer>
        <SectionHeader title="Vergaderingen" subtitle="Laden…" />
        <div className="mt-8 h-32 flex items-center justify-center text-textSecondary text-sm">Laden…</div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <SectionHeader title="Vergaderingen" subtitle="Notities en AI-samenvatting" />
      <ModuleLockBanner moduleKey="meeting_notes" moduleLabel="Vergaderingen" className="mt-4" />

      {notes.length > 0 && (
        <Card className="mt-8 p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-textPrimary text-base">Opgeslagen vergaderingen</CardTitle>
            <p className="text-sm text-textSecondary font-normal mt-1">Klik op een notitie om te bewerken.</p>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleDone(n)}
                    disabled={moduleLocked}
                    title={n.done ? 'Terugzetten' : 'Afvinken'}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-border hover:bg-hover disabled:opacity-50"
                  >
                    {n.done ? <Check className="h-4 w-4 text-primary" /> : <span className="w-4 h-4 rounded border-2 border-border" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentNote(n)
                      setNotities(n.content ?? '')
                      setSummary(n.summary ?? null)
                    }}
                    className={`flex-1 min-w-0 text-left rounded-xl border px-4 py-3 transition-colors ${currentNote?.id === n.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-hover'} ${n.done ? 'opacity-75' : ''}`}
                  >
                    <span className={`font-medium text-textPrimary block truncate ${n.done ? 'line-through' : ''}`}>{n.title || 'Zonder titel'}</span>
                    <span className="text-xs text-textSecondary">{new Date(n.updated_at).toLocaleString('nl-NL')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDeleteId(n.id) }}
                    disabled={moduleLocked}
                    title="Verwijderen"
                    className="shrink-0 p-2 text-textSecondary hover:text-danger rounded-lg hover:bg-danger/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <Button
              variant="ghost"
              className="mt-3 w-full justify-start"
              onClick={() => {
                setCurrentNote(null)
                setNotities('')
                setSummary(null)
              }}
              disabled={moduleLocked}
            >
              <Plus className="h-4 w-4 mr-2" /> Nieuwe vergadering
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mt-8 p-6">
        <CardHeader className="p-0 pb-4 flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-textPrimary">Notities</CardTitle>
          <Button variant="secondary" onClick={handleSave} disabled={moduleLocked || saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Bezig…' : 'Opslaan'}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <textarea
            value={notities}
            onChange={(e) => setNotities(e.target.value)}
            placeholder="Typ hier je vergadernotities..."
            disabled={moduleLocked}
            className="w-full min-h-[120px] rounded-xl border border-border bg-card px-4 py-3 text-sm text-textPrimary placeholder:text-textSecondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y disabled:opacity-50 disabled:pointer-events-none"
            rows={5}
          />
          <Button className="mt-4" onClick={handleSummarize} disabled={moduleLocked || loading}>
            {loading && (
              <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <Sparkles className="h-4 w-4 mr-2" /> Demo-samenvatting
          </Button>
        </CardContent>
      </Card>

      {(loading || summary) && (
        <Card className="mt-8 p-6 min-h-[120px]">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-textPrimary">Samenvatting</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Bezig met samenvatten…
              </div>
            ) : (
              <p className="text-textPrimary text-sm whitespace-pre-line">{summary}</p>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDeleteDialog
        open={deleteId != null}
        title="Vergadering verwijderen"
        message="Weet je zeker dat je deze vergadernotitie wilt verwijderen?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
        loading={deleteLoading}
      />
    </PageContainer>
  )
}
