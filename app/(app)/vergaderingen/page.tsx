'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageContainer } from '@/components/ui/PageContainer'
import { useToast } from '@/context/ToastContext'
import { logActivity } from '@/lib/audit'
import { Sparkles, Save } from 'lucide-react'

type Note = { id: string; content: string; summary: string | null; updated_at: string }

export default function VergaderingenPage() {
  const toast = useToast()
  const [notities, setNotities] = useState('')
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [loadDone, setLoadDone] = useState(false)

  const loadNote = useCallback(async () => {
    const res = await fetch('/api/meeting-notes', { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.note) {
      setCurrentNote(data.note)
      setNotities(data.note.content ?? '')
      setSummary(data.note.summary ?? null)
    } else {
      setCurrentNote(null)
      setNotities('')
      setSummary(null)
    }
    setLoadDone(true)
  }, [])

  useEffect(() => {
    loadNote()
  }, [loadNote])

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
      toast('Opgeslagen')
    }
  }, [currentNote, notities, toast])

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

      <Card className="mt-8 p-6">
        <CardHeader className="p-0 pb-4 flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-textPrimary">Notities</CardTitle>
          <Button variant="secondary" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Bezig…' : 'Opslaan'}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <textarea
            value={notities}
            onChange={(e) => setNotities(e.target.value)}
            placeholder="Typ hier je vergadernotities..."
            className="w-full min-h-[120px] rounded-xl border border-border bg-card px-4 py-3 text-sm text-textPrimary placeholder:text-textSecondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
            rows={5}
          />
          <Button className="mt-4" onClick={handleSummarize} disabled={loading}>
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
    </PageContainer>
  )
}
