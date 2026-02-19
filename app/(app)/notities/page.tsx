'use client'

import { useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageContainer } from '@/components/ui/PageContainer'
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
    <PageContainer>
      <SectionHeader title="Notities" subtitle="Overzicht" action={<Button onClick={handleNewNote}><Plus className="h-4 w-4 mr-2" /> Nieuwe notitie</Button>} />
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {notes.map((note) => (
          <Card
            key={note.id}
            className="p-6 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            onClick={() => setDetailId(detailId === note.id ? null : note.id)}
          >
            <div className="flex items-start gap-2">
              <StickyNote className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{note.title}</p>
                <p className="text-sm text-slate-500">{new Date(note.date).toLocaleDateString('nl-NL')}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {detailId && (
        <Card className="mt-8 p-6">
          <CardHeader className="p-0 pb-4 flex justify-between items-center">
            <CardTitle className="text-slate-900">Detail (placeholder)</CardTitle>
            <Button variant="ghost" onClick={() => setDetailId(null)}>Sluiten</Button>
          </CardHeader>
          <CardContent className="p-0 text-slate-600 text-sm">Klik op een kaart om detail te openen. UI-only.</CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
