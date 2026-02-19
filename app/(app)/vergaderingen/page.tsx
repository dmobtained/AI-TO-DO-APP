'use client'

import { useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageContainer } from '@/components/ui/PageContainer'
import { logActivity } from '@/lib/audit'
import { Users, Sparkles } from 'lucide-react'

export default function VergaderingenPage() {
  const [notities, setNotities] = useState('')
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSummarize = useCallback(() => {
    setLoading(true)
    setSummary(null)
    setTimeout(() => {
      setSummary('Placeholder samenvatting: dit is een voorbeeldtekst. AI samenvatten wordt later gekoppeld.')
      setLoading(false)
      logActivity({ action: 'meeting.summarize', entity_type: 'meeting' })
    }, 600)
  }, [])

  return (
    <PageContainer>
      <SectionHeader title="Vergaderingen" subtitle="Notities en AI-samenvatting" />

      <Card className="mt-8 p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-slate-900">Notities</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <textarea
            value={notities}
            onChange={(e) => setNotities(e.target.value)}
            placeholder="Typ hier je vergadernotities..."
            className="w-full min-h-[120px] rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 resize-y"
            rows={5}
          />
          <Button className="mt-4" onClick={handleSummarize} disabled={loading}>
            {loading && (
              <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <Sparkles className="h-4 w-4 mr-2" /> AI samenvatten
          </Button>
        </CardContent>
      </Card>

      {(loading || summary) && (
        <Card className="mt-8 p-6 min-h-[120px]">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-slate-900">Samenvatting</CardTitle>
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
              <p className="text-slate-700 text-sm whitespace-pre-line">{summary}</p>
            )}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
