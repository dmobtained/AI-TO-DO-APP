'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { ModulePageLayout } from '@/components/modules/ModulePageLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmDeleteDialog } from '@/components/modules/ConfirmDeleteDialog'
import { StickyNote, Plus, Pin, Trash2 } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

type Note = {
  id: string
  user_id: string
  title: string
  content: string
  pinned: boolean
  created_at: string
  updated_at: string
}

const DEBOUNCE_MS = 500

export default function NotitiesPage() {
  const toast = useToast()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [canWrite, setCanWrite] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editDraft, setEditDraft] = useState<{ title: string; content: string }>({ title: '', content: '' })

  const selectedNote = selectedId ? notes.find((n) => n.id === selectedId) : null

  const fetchNotes = useCallback(async () => {
    setLoadError(false)
    const res = await fetch('/api/notes', { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setLoadError(true)
      toast(data.error ?? 'Notities laden mislukt', 'error')
      setNotes([])
      return
    }
    setNotes(data.notes ?? [])
  }, [toast])

  const fetchAccess = useCallback(async () => {
    const res = await fetch('/api/modules/access?slug=notities', { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    setCanWrite(data.canWrite === true)
  }, [])

  useEffect(() => {
    let mounted = true
    Promise.all([fetchNotes(), fetchAccess()]).finally(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [fetchNotes, fetchAccess])

  useEffect(() => {
    if (selectedNote) {
      setEditDraft({ title: selectedNote.title, content: selectedNote.content })
    }
  }, [selectedId, selectedNote])

  const persistNote = useCallback(
    async (id: string, payload: { title?: string; content?: string; pinned?: boolean }) => {
      setSaving(true)
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      setSaving(false)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast(err.error ?? 'Opslaan mislukt', 'error')
        return
      }
      const data = await res.json()
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...data.note } : n)))
    },
    [toast]
  )

  useEffect(() => {
    if (!selectedNote || !canWrite) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      const titleOk = editDraft.title === selectedNote.title
      const contentOk = editDraft.content === selectedNote.content
      if (titleOk && contentOk) return
      persistNote(selectedNote.id, {
        ...(titleOk ? {} : { title: editDraft.title }),
        ...(contentOk ? {} : { content: editDraft.content }),
      })
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [editDraft.title, editDraft.content, selectedNote, canWrite, persistNote])

  const handleCreate = useCallback(async () => {
    if (!canWrite) return
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: 'Nieuwe notitie', content: '', pinned: false }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast(err.error ?? 'Aanmaken mislukt', 'error')
      return
    }
    const data = await res.json()
    setNotes((prev) => [data.note, ...prev])
    setSelectedId(data.note.id)
    toast('Notitie aangemaakt')
  }, [canWrite, toast])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    const res = await fetch(`/api/notes/${deleteId}`, { method: 'DELETE', credentials: 'include' })
    setDeleteLoading(false)
    setDeleteId(null)
    if (!res.ok) {
      toast('Verwijderen mislukt', 'error')
      return
    }
    setNotes((prev) => prev.filter((n) => n.id !== deleteId))
    if (selectedId === deleteId) setSelectedId(null)
    toast('Notitie verwijderd')
  }, [deleteId, selectedId])

  const handleTogglePinned = useCallback(
    async (note: Note) => {
      if (!canWrite) return
      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pinned: !note.pinned }),
      })
      if (!res.ok) return
      const data = await res.json()
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, ...data.note } : n)))
    },
    [canWrite]
  )

  if (loading) {
    return (
      <ModulePageLayout title="Notities" subtitle="Laden…">
        <div className="h-32 flex items-center justify-center text-slate-500 text-sm">Laden…</div>
      </ModulePageLayout>
    )
  }

  const statCards = [
    { title: 'Notities', value: notes.length },
    { title: 'Gepind', value: notes.filter((n) => n.pinned).length },
  ]

  return (
    <ModulePageLayout
      title="Notities"
      subtitle="Overzicht"
      locked={!canWrite}
      lockedLabel="Notities"
      statCards={statCards}
      primaryAction={
        canWrite ? (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Nieuwe notitie
          </Button>
        ) : null
      }
    >
      {!loading && (loadError || notes.length === 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          {loadError ? (
            <>
              <p className="text-slate-600 mb-3">Notities konden niet worden geladen. Controleer of je bent ingelogd en of de database (Supabase) draait.</p>
              <Button variant="secondary" onClick={() => { setLoading(true); fetchNotes().finally(() => setLoading(false)) }}>
                Opnieuw laden
              </Button>
            </>
          ) : (
            <p className="text-slate-500">Nog geen notities. Klik op &quot;Nieuwe notitie&quot; om te beginnen.</p>
          )}
        </div>
      )}
      {notes.length > 0 && (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {notes.map((note) => (
          <Card
            key={note.id}
            className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${selectedId === note.id ? 'ring-2 ring-[#2563eb]' : ''}`}
            onClick={() => setSelectedId(selectedId === note.id ? null : note.id)}
          >
            <div className="flex items-start gap-2">
              <StickyNote className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 truncate">{note.title || 'Zonder titel'}</p>
                <p className="text-sm text-slate-500">
                  {new Date(note.updated_at).toLocaleDateString('nl-NL')}
                </p>
              </div>
              {note.pinned && <Pin className="h-4 w-4 text-[#2563eb] shrink-0" />}
            </div>
          </Card>
        ))}
      </div>
      )}

      {selectedNote && (
        <Card className="mt-8 p-6">
          <CardHeader className="p-0 pb-4 flex justify-between items-center flex-wrap gap-2">
            <CardTitle className="text-slate-900">Bewerken</CardTitle>
            <div className="flex items-center gap-2">
              {saving && <span className="text-xs text-slate-500">Opslaan…</span>}
              {canWrite && (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => handleTogglePinned(selectedNote)}
                    title={selectedNote.pinned ? 'Losmaken' : 'Pinnen'}
                  >
                    <Pin className={`h-4 w-4 ${selectedNote.pinned ? 'text-[#2563eb]' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setDeleteId(selectedNote.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={() => setSelectedId(null)}>Sluiten</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Input
              className="mb-4"
              value={editDraft.title}
              onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Titel"
              disabled={!canWrite}
            />
            <textarea
              className="w-full min-h-[200px] rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 resize-y"
              value={editDraft.content}
              onChange={(e) => setEditDraft((d) => ({ ...d, content: e.target.value }))}
              placeholder="Inhoud"
              disabled={!canWrite}
            />
          </CardContent>
        </Card>
      )}

      <ConfirmDeleteDialog
        open={deleteId != null}
        title="Notitie verwijderen"
        message="Weet je zeker dat je deze notitie wilt verwijderen?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
        loading={deleteLoading}
      />
    </ModulePageLayout>
  )
}
