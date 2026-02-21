'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageContainer } from '@/components/ui/PageContainer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/context/ToastContext'
import { useModuleLock } from '@/hooks/useModuleLock'
import { ModuleLockBanner } from '@/components/modules/ModuleLockBanner'
import { UserPlus, Phone, Handshake, Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

type Lead = {
  id: string
  title: string
  stage: 'lead' | 'gesprek' | 'deal'
  notes: string | null
  created_at: string
  updated_at: string
}

const STAGES: { id: 'lead' | 'gesprek' | 'deal'; label: string; icon: typeof UserPlus }[] = [
  { id: 'lead', label: 'Lead', icon: UserPlus },
  { id: 'gesprek', label: 'Gesprek', icon: Phone },
  { id: 'deal', label: 'Deal', icon: Handshake },
]

export default function BusinessPage() {
  const toast = useToast()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [addingStage, setAddingStage] = useState<'lead' | 'gesprek' | 'deal' | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const { locked: moduleLocked } = useModuleLock('leads')

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/leads', { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    setLeads(data.leads ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const leadsByStage = (stage: string) => leads.filter((l) => l.stage === stage)
  const totalLeads = leads.length
  const totalDeals = leadsByStage('deal').length
  const conversie = totalLeads > 0 ? Math.round((totalDeals / totalLeads) * 100) : 0

  const handleAdd = async (stage: 'lead' | 'gesprek' | 'deal') => {
    const title = newTitle.trim() || 'Nieuwe lead'
    setAddingStage(null)
    setNewTitle('')
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, stage }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast(data.error ?? 'Toevoegen mislukt', 'error')
      return
    }
    toast('Toegevoegd')
    fetchLeads()
  }

  const handleMove = async (lead: Lead, direction: 'prev' | 'next') => {
    const order = ['lead', 'gesprek', 'deal'] as const
    const i = order.indexOf(lead.stage)
    const next = direction === 'next' ? order[i + 1] : order[i - 1]
    if (!next) return
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ stage: next }),
    })
    if (!res.ok) {
      toast('Verplaatsen mislukt', 'error')
      return
    }
    toast('Verplaatst')
    fetchLeads()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/leads/${id}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) {
      toast('Verwijderen mislukt', 'error')
      return
    }
    toast('Verwijderd')
    fetchLeads()
  }

  return (
    <PageContainer>
      <SectionHeader title="Business pipeline" subtitle="Leads en deals" />
      <ModuleLockBanner moduleKey="leads" moduleLabel="Leads" className="mt-4" />
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard title="Totaal leads" value={loading ? '—' : String(totalLeads)} />
        <StatCard title="Conversieratio" value={loading ? '—' : `${conversie}%`} />
        <StatCard title="Deals" value={loading ? '—' : String(totalDeals)} />
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {STAGES.map(({ id, label, icon: Icon }) => {
          const list = leadsByStage(id)
          const isFirst = id === 'lead'
          const isLast = id === 'deal'
          return (
            <Card key={id} className="p-6 min-h-[400px] flex flex-col">
              <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Icon className="h-5 w-5 text-slate-500" /> {label}
                </CardTitle>
                <Button
                  variant="ghost"
                  onClick={() => !moduleLocked && setAddingStage(id)}
                  disabled={moduleLocked}
                  className="shrink-0"
                  aria-label={`${label} toevoegen`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                {addingStage === id ? (
                  <div className="rounded-xl border border-[#e5e7eb] bg-slate-50 p-4 space-y-2">
                    <Input
                      placeholder="Naam / bedrijf"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdd(id)}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleAdd(id)} disabled={moduleLocked || !newTitle.trim()}>
                        Toevoegen
                      </Button>
                      <Button variant="ghost" onClick={() => { setAddingStage(null); setNewTitle('') }}>
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : list.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center min-h-[280px]">
                    <EmptyState
                      icon={Icon}
                      title={`Geen ${label.toLowerCase()}en`}
                      description="Klik op + om toe te voegen."
                    />
                  </div>
                ) : (
                  <ul className="space-y-2 flex-1 min-h-0">
                    {list.map((lead) => (
                      <li
                        key={lead.id}
                        className="rounded-xl border border-[#e5e7eb] bg-white p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow"
                      >
                        <p className="font-medium text-slate-900 truncate">{lead.title}</p>
                        <div className="flex items-center justify-between gap-1">
                          {!isFirst && (
                            <button
                              type="button"
                              onClick={() => !moduleLocked && handleMove(lead, 'prev')}
                              disabled={moduleLocked}
                              className="p-1.5 text-slate-500 hover:text-[#2563eb] rounded disabled:opacity-50 disabled:pointer-events-none"
                              aria-label="Naar vorige kolom"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                          )}
                          <span className="flex-1 min-w-0" />
                          {!isLast && (
                            <button
                              type="button"
                              onClick={() => !moduleLocked && handleMove(lead, 'next')}
                              disabled={moduleLocked}
                              className="p-1.5 text-slate-500 hover:text-[#2563eb] rounded disabled:opacity-50 disabled:pointer-events-none"
                              aria-label="Naar volgende kolom"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => !moduleLocked && handleDelete(lead.id)}
                            disabled={moduleLocked}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded disabled:opacity-50 disabled:pointer-events-none"
                            aria-label="Verwijderen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </PageContainer>
  )
}
