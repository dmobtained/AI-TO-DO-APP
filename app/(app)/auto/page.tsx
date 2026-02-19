'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageContainer } from '@/components/ui/PageContainer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthProvider'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { Fuel, Wrench, AlertCircle, Car, Plus, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

type AutoEntry = {
  id: string
  type: string
  title: string
  amount: number
  entry_date: string
  notes: string | null
  odometer_km: number | null
  created_at: string
}

const TABS = [
  { value: 'fuel', label: 'Tankbeurten', icon: Fuel },
  { value: 'maintenance', label: 'Onderhoud', icon: Wrench },
  { value: 'repair', label: 'Reparaties', icon: AlertCircle },
  { value: 'purchase', label: 'Aanschaf', icon: Car },
] as const

export default function AutoPage() {
  const toast = useToast()
  const { user } = useAuth()
  const [entries, setEntries] = useState<AutoEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>('fuel')
  const [kenteken, setKenteken] = useState<string>('')
  const [kentekenSaving, setKentekenSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    amount: '',
    entry_date: new Date().toISOString().slice(0, 10),
    notes: '',
    odometer_km: '',
  })
  const [adding, setAdding] = useState(false)

  const loadKenteken = useCallback(async () => {
    if (!user?.id) return
    const supabase = getSupabaseClient()
    const { data } = await supabase.from('profiles').select('kenteken').eq('id', user.id).maybeSingle()
    setKenteken(data?.kenteken ?? '')
  }, [user?.id])

  useEffect(() => {
    loadKenteken()
  }, [loadKenteken])

  const saveKenteken = useCallback(
    async (value: string) => {
      if (!user?.id) return
      setKentekenSaving(true)
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('profiles').update({ kenteken: value.trim() || null }).eq('id', user.id)
      setKentekenSaving(false)
      if (error) {
        toast(error.message, 'error')
        return
      }
      setKenteken(value.trim())
      toast('Kenteken opgeslagen')
    },
    [user?.id, toast]
  )

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/auto', { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    setEntries((data.entries ?? []).map((e: { amount: string } & AutoEntry) => ({ ...e, amount: Number(e.amount) ?? 0 })))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const thisYear = new Date().getFullYear()
  const yearStart = `${thisYear}-01-01`
  const yearEnd = `${thisYear}-12-31`
  const entriesThisYear = entries.filter((e) => e.entry_date >= yearStart && e.entry_date <= yearEnd)
  const totalCostYear = entriesThisYear.reduce((s, e) => s + e.amount, 0)
  const purchaseEntries = entries.filter((e) => e.type === 'purchase')
  const aanschafwaarde = purchaseEntries.reduce((s, e) => s + e.amount, 0)
  const entriesByType = (type: string) => entries.filter((e) => e.type === type)

  const handleAdd = async (type: string) => {
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (Number.isNaN(amount) || amount < 0) {
      toast('Voer een geldig bedrag in', 'error')
      return
    }
    setAdding(true)
    const res = await fetch('/api/auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        type,
        title: form.title.trim() || (type === 'fuel' ? 'Tankbeurt' : type === 'maintenance' ? 'Onderhoud' : type === 'repair' ? 'Reparatie' : 'Aanschaf'),
        amount,
        entry_date: form.entry_date,
        notes: form.notes.trim() || null,
        odometer_km: form.odometer_km ? parseInt(form.odometer_km, 10) : null,
      }),
    })
    setAdding(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast(data.error ?? 'Opslaan mislukt', 'error')
      return
    }
    toast('Toegevoegd')
    setForm({ title: '', amount: '', entry_date: new Date().toISOString().slice(0, 10), notes: '', odometer_km: '' })
    fetchEntries()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/auto/${id}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) {
      toast('Verwijderen mislukt', 'error')
      return
    }
    toast('Verwijderd')
    fetchEntries()
  }

  return (
    <PageContainer>
      <SectionHeader
        title="Auto"
        subtitle="Kosten en onderhoud"
        action={
          <div className="flex items-center gap-2 text-right">
            <span className="text-xs text-slate-500 uppercase tracking-wide shrink-0">Kenteken</span>
            <Input
              placeholder="AB-123-CD"
              value={kenteken}
              onChange={(e) => setKenteken(e.target.value)}
              onBlur={() => saveKenteken(kenteken)}
              disabled={kentekenSaving}
              className="w-24 h-7 text-xs font-mono text-slate-700"
            />
          </div>
        }
      />

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Totale kosten dit jaar" value={loading ? '€ —' : `€ ${totalCostYear.toFixed(2)}`} />
        <StatCard title="Kosten per km" value="€ —" />
        <StatCard title="Aanschafwaarde" value={loading ? '€ —' : `€ ${aanschafwaarde.toFixed(2)}`} />
        <StatCard title="Huidige waarde" value="€ —" />
      </div>

      <Card className="mt-8 p-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map(({ value, label, icon: Icon }) => {
            const list = entriesByType(value)
            return (
              <TabsContent key={value} value={value}>
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-2 items-end">
                    <Input
                      placeholder={value === 'fuel' ? 'Bijv. Tankstation' : 'Omschrijving'}
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-40"
                    />
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Bedrag (€)"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-28"
                    />
                    <Input
                      type="date"
                      value={form.entry_date}
                      onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))}
                      className="w-36"
                    />
                    {value === 'fuel' && (
                      <Input
                        placeholder="Km-stand"
                        value={form.odometer_km}
                        onChange={(e) => setForm((f) => ({ ...f, odometer_km: e.target.value }))}
                        className="w-24"
                      />
                    )}
                    <Input
                      placeholder="Notitie (optioneel)"
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-48"
                    />
                    <Button onClick={() => handleAdd(value)} disabled={adding || !form.amount.trim()}>
                      <Plus className="h-4 w-4 mr-2" /> Toevoegen
                    </Button>
                  </div>
                  {list.length === 0 ? (
                    <EmptyState
                      icon={Icon}
                      title={`Geen ${label.toLowerCase()}`}
                      description={`Voeg een ${value === 'fuel' ? 'tankbeurt' : value === 'maintenance' ? 'onderhoudsregel' : 'reparatie'} toe via het formulier hierboven.`}
                    />
                  ) : (
                    <ul className="divide-y divide-slate-200">
                      {list.map((e) => (
                        <li key={e.id} className="py-3 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-slate-900">{e.title}</p>
                            <p className="text-sm text-slate-500">
                              {e.entry_date}
                              {e.odometer_km != null && ` · ${e.odometer_km} km`}
                              {e.notes && ` · ${e.notes}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">€ {e.amount.toFixed(2)}</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(e.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                              aria-label="Verwijderen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </Card>

    </PageContainer>
  )
}
