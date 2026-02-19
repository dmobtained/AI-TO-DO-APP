'use client'

import { useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { logActivity } from '@/lib/audit'
import { StickyNote, Plus } from 'lucide-react'

type Note = { id: string; title: string; date: string }

export default function NotitiesPage() {
  const [notes, setNotes] = useState<Note[]>([
    { id: '1', title: 'Voorbeeld notitie', date: new Date().toISOString().slice(0, 10) },
  ])
  const [detailId, setDetailId] = useState<string | null>(null)

  const handleNewNote = useCallback(() => {
    const id = crypto.randomUUID()
    const date = new Date().toISOString().slice(0, 10)
    setNotes((prev) => [{ id, title: 'Nieuwe notitie', date }, ...prev])
    setDetailId(id)
    logActivity({ action: 'note.create', entity_type: 'note', entity_id: id })
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Notities</h1>
        <Button onClick={handleNewNote}>
          <Plus className="h-4 w-4 mr-2" /> Nieuwe notitie
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note) => (
          <Card
            key={note.id}
            className="p-6 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setDetailId(detailId === note.id ? null : note.id)}
          >
            <div className="flex items-start gap-2">
              <StickyNote className="h-5 w-5 text-white/60 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{note.title}</p>
                <p className="text-sm text-white/50">{new Date(note.date).toLocaleDateString('nl-NL')}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {detailId && (
        <Card className="p-6">
          <CardHeader className="p-0 pb-4 flex justify-between items-center">
            <CardTitle>Detail (placeholder)</CardTitle>
            <button type="button" onClick={() => setDetailId(null)} className="text-white/60 hover:text-white text-sm">Sluiten</button>
          </CardHeader>
          <CardContent className="p-0 text-white/80 text-sm">Klik op een kaart om detail te openen. UI-only.</CardContent>
        </Card>
      )}
    </div>
  )
}
