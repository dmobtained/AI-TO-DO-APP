'use client'

import { useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageContainer } from '@/components/ui/PageContainer'
import { Copy, Check } from 'lucide-react'

function CopyField({ label, value, editable, onEdit }: { label: string; value: string; editable?: boolean; onEdit?: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [value])
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[#e5e7eb] last:border-0 group">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-slate-900 font-medium mt-0.5">{value || '—'}</p>
      </div>
      <div className="flex items-center gap-2">
        {editable && onEdit && <Button variant="ghost" onClick={onEdit} className="text-sm">Bewerken</Button>}
        <Button variant="secondary" onClick={copy} className="shrink-0 px-3 py-2 transition-all duration-200 hover:ring-2 hover:ring-[#2563eb]/30">
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

export default function PersoonlijkeInfoPage() {
  const [length, setLength] = useState('180 cm')
  const [weight, setWeight] = useState('75 kg')
  const [editingLength, setEditingLength] = useState(false)
  const [editingWeight, setEditingWeight] = useState(false)

  return (
    <PageContainer>
      <SectionHeader title="Persoonlijke info" subtitle="Gegevens" />

      <div className="mt-8 max-w-2xl">
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-slate-900">Gegevens</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <CopyField label="BSN" value="123456782" />
            <CopyField label="IBAN" value="NL91 ABNA 0417 1643 00" />
            <CopyField label="Lengte" value={length} editable onEdit={() => setEditingLength((e) => !e)} />
            {editingLength && (
              <div className="py-2 flex items-center gap-2">
                <input type="text" value={length} onChange={(e) => setLength(e.target.value)} className="rounded-xl border border-[#e5e7eb] px-3 py-2 text-sm w-24" />
                <Button variant="secondary" onClick={() => setEditingLength(false)}>Opslaan</Button>
              </div>
            )}
            <CopyField label="Gewicht" value={weight} editable onEdit={() => setEditingWeight((e) => !e)} />
            {editingWeight && (
              <div className="py-2 flex items-center gap-2">
                <input type="text" value={weight} onChange={(e) => setWeight(e.target.value)} className="rounded-xl border border-[#e5e7eb] px-3 py-2 text-sm w-24" />
                <Button variant="secondary" onClick={() => setEditingWeight(false)}>Opslaan</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
