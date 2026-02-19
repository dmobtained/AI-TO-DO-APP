'use client'

import { useState, useCallback, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthProvider'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageContainer } from '@/components/ui/PageContainer'
import { useToast } from '@/context/ToastContext'
import { Copy, Check } from 'lucide-react'

export default function PersoonlijkeInfoPage() {
  const toast = useToast()
  const { user } = useAuth()
  const [profile, setProfile] = useState<{ bsn: string | null; iban: string | null; length_cm: string | null; weight_kg: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!user?.id) return
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('bsn, iban, length_cm, weight_kg')
      .eq('id', user.id)
      .maybeSingle()
    if (!error) setProfile(data ?? { bsn: null, iban: null, length_cm: null, weight_kg: null })
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const saveField = useCallback(
    async (field: 'bsn' | 'iban' | 'length_cm' | 'weight_kg', value: string) => {
      if (!user?.id) return
      setSaving(true)
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('profiles').update({ [field]: value.trim() || null }).eq('id', user.id)
      setSaving(false)
      if (error) {
        toast(error.message, 'error')
        return
      }
      setProfile((p) => (p ? { ...p, [field]: value.trim() || null } : p))
      toast('Opgeslagen')
    },
    [user?.id, toast]
  )

  if (loading) {
    return (
      <PageContainer>
        <SectionHeader title="Persoonlijke info" subtitle="Laden…" />
        <div className="mt-8 h-32 flex items-center justify-center text-slate-500 text-sm">Laden…</div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <SectionHeader title="Persoonlijke info" subtitle="Gegevens" />

      <div className="mt-8 max-w-2xl">
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-slate-900">Gegevens</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-0">
            <div className="flex items-center justify-between gap-4 py-3 border-b border-[#e5e7eb]">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">BSN</p>
                <p className="text-slate-900 font-medium mt-0.5">{profile?.bsn || '—'}</p>
              </div>
              <EditableField
                label="BSN"
                value={profile?.bsn ?? ''}
                onSave={(v) => saveField('bsn', v)}
                saving={saving}
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-3 border-b border-[#e5e7eb]">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">IBAN</p>
                <p className="text-slate-900 font-medium mt-0.5">{profile?.iban || '—'}</p>
              </div>
              <EditableField
                label="IBAN"
                value={profile?.iban ?? ''}
                onSave={(v) => saveField('iban', v)}
                saving={saving}
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-3 border-b border-[#e5e7eb]">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Lengte</p>
                <p className="text-slate-900 font-medium mt-0.5">{profile?.length_cm || '—'}</p>
              </div>
              <EditableField
                label="Lengte"
                value={profile?.length_cm ?? ''}
                onSave={(v) => saveField('length_cm', v)}
                saving={saving}
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Gewicht</p>
                <p className="text-slate-900 font-medium mt-0.5">{profile?.weight_kg || '—'}</p>
              </div>
              <EditableField
                label="Gewicht"
                value={profile?.weight_kg ?? ''}
                onSave={(v) => saveField('weight_kg', v)}
                saving={saving}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

function EditableField({
  label,
  value,
  onSave,
  saving,
}: {
  label: string
  value: string
  onSave: (v: string) => void
  saving: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {editing ? (
        <>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-36"
            placeholder={label === 'BSN' ? '123456782' : label === 'IBAN' ? 'NL91 ABNA...' : label === 'Lengte' ? '180 cm' : '75 kg'}
          />
          <Button size="sm" onClick={() => { onSave(draft); setEditing(false) }} disabled={saving}>
            {saving ? 'Bezig…' : 'Opslaan'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(value) }}>
            Annuleren
          </Button>
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Bewerken
          </Button>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </>
      )}
    </div>
  )
}
