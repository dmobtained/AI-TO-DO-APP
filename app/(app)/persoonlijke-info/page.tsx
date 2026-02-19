'use client'

import { useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Copy, Check } from 'lucide-react'

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [value])
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
      <div>
        <p className="text-xs text-white/50 uppercase tracking-wide">{label}</p>
        <p className="text-white font-medium mt-0.5">{value || '—'}</p>
      </div>
      <Button variant="secondary" onClick={copy} className="shrink-0 px-3 py-2">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}

export default function PersoonlijkeInfoPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-white">Persoonlijke info</h1>
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle>Gegevens</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CopyField label="BSN" value="123456782" />
          <CopyField label="IBAN" value="NL91 ABNA 0417 1643 00" />
          <CopyField label="Lengte" value="180 cm" />
          <CopyField label="Gewicht" value="75 kg" />
        </CardContent>
      </Card>
    </div>
  )
}
