'use client'

import { useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { logActivity } from '@/lib/audit'
import { Users, Sparkles } from 'lucide-react'

export default function VergaderingenPage() {
  const [notities, setNotities] = useState('')
  const [summary, setSummary] = useState<string | null>(null)

  const handleSummarize = useCallback(() => {
    setSummary('Placeholder samenvatting: dit is een voorbeeldtekst. AI samenvatten wordt later gekoppeld.')
    logActivity({ action: 'meeting.summarize', entity_type: 'meeting' })
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
        <Users className="h-7 w-7" /> Vergaderingen
      </h1>
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle>Notities</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <textarea
            value={notities}
            onChange={(e) => setNotities(e.target.value)}
            placeholder="Typ hier je vergadernotities..."
            className="w-full min-h-[120px] rounded-xl border border-white/10 bg-[#171a21] px-4 py-3 text-sm text-white placeholder:text-white/50 focus:border-[#3b82f6] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 resize-y"
            rows={5}
          />
          <Button className="mt-4" onClick={handleSummarize}>
            <Sparkles className="h-4 w-4 mr-2" /> AI samenvatten
          </Button>
        </CardContent>
      </Card>
      {summary && (
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Samenvatting</CardTitle>
          </CardHeader>
          <CardContent className="p-0 text-white/90 text-sm whitespace-pre-line">{summary}</CardContent>
        </Card>
      )}
    </div>
  )
}
