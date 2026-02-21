'use client'
export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { useDashboard } from '@/context/DashboardContext'
import { FeatureGuard } from '@/components/FeatureGuard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageContainer } from '@/components/ui/PageContainer'
import { useToast } from '@/context/ToastContext'
import type { FinanceEntry } from './components/types'
import { getMonthRange } from './components/types'
import { Building2, CreditCard, PiggyBank, Receipt, Trash2 } from 'lucide-react'

const SECTIONS = [
  { id: 'abonnementen', label: 'Abonnementen' },
  { id: 'huur', label: 'Huur/hypotheek' },
  { id: 'verzekeringen', label: 'Verzekeringen' },
  { id: 'energie', label: 'Energie/internet' },
  { id: 'belastingen', label: 'Belastingen' },
  { id: 'losse', label: 'Losse uitgaven' },
]

export default function FinancienOverviewPage() {
  const supabase = getSupabaseClient()
  const router = useRouter()
  const toast = useToast()
  const { user, loading: authLoading } = useDashboardUser()
  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [addingSection, setAddingSection] = useState<string | null>(null)
  const [addForm, setAddForm] = useState({ title: '', amount: '', entry_date: new Date().toISOString().slice(0, 10) })
  const { first, last } = useMemo(() => getMonthRange(), [])

  const fetchEntries = useCallback(async () => {
    if (!user?.id) return
    const { data, error: err } = await supabase
      .from('finance_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', first)
      .lte('entry_date', last)
      .order('entry_date', { ascending: false })
    if (err) {
      setEntries([])
      toast(err.message || 'Financiën laden mislukt', 'error')
      return
    }
    const list = Array.isArray(data) ? data : (data ? [data] : [])
    setEntries(list as FinanceEntry[])
  }, [user?.id, first, last, toast])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/')
      return
    }
    setLoading(true)
    fetchEntries().finally(() => setLoading(false))
  }, [user?.id, authLoading, router, fetchEntries])

  const totalIncome = useMemo(
    () => entries.filter((e) => e.type === 'income').reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [entries]
  )
  const totalExpense = useMemo(
    () => entries.filter((e) => e.type === 'expense').reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [entries]
  )
  const balance = totalIncome - totalExpense
  const vasteLasten = totalExpense

  const entriesBySection = useMemo(() => {
    const map: Record<string, FinanceEntry[]> = {}
    for (const s of SECTIONS) map[s.id] = []
    for (const e of entries) {
      if (e.type !== 'expense') continue
      const cat = e.category && SECTIONS.some((s) => s.id === e.category) ? e.category : 'losse'
      if (!map[cat]) map[cat] = []
      map[cat].push(e)
    }
    for (const s of SECTIONS) {
      (map[s.id] ?? []).sort((a, b) => (b.entry_date ?? '').localeCompare(a.entry_date ?? ''))
    }
    return map
  }, [entries])

  const handleAddToSection = useCallback(
    async (sectionId: string) => {
      if (!user?.id || !addForm.title.trim() || !addForm.amount.trim()) return
      setAddingSection(sectionId)
      const amount = parseFloat(addForm.amount.replace(',', '.'))
      if (Number.isNaN(amount) || amount < 0) {
        toast('Voer een geldig bedrag in', 'error')
        setAddingSection(null)
        return
      }
      const { error } = await supabase.from('finance_entries').insert({
        user_id: user.id,
        type: 'expense',
        title: addForm.title.trim(),
        amount: String(amount),
        entry_date: addForm.entry_date,
        category: sectionId,
      })
      setAddingSection(null)
      if (error) {
        toast(error.message, 'error')
        return
      }
      setAddForm({ title: '', amount: '', entry_date: new Date().toISOString().slice(0, 10) })
      toast('Uitgave toegevoegd')
      fetchEntries()
    },
    [user?.id, addForm, supabase, toast, fetchEntries]
  )

  const handleDeleteEntry = useCallback(
    async (entry: FinanceEntry) => {
      if (!user?.id) return
      const { error } = await supabase.from('finance_entries').delete().eq('id', entry.id).eq('user_id', user.id)
      if (error) {
        toast(error.message, 'error')
        return
      }
      toast('Verwijderd')
      fetchEntries()
    },
    [user?.id, supabase, toast, fetchEntries]
  )

  if (authLoading || !user) {
    return (
      <PageContainer>
        <div className="h-8 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="mt-4 h-4 w-64 rounded bg-slate-200 animate-pulse" />
      </PageContainer>
    )
  }

  const links = [
    { href: '/dashboard/financien/bank', label: 'Bank saldo', icon: CreditCard },
    { href: '/dashboard/financien/lasten', label: 'Vaste lasten', icon: Building2 },
    { href: '/dashboard/financien/beleggen', label: 'Beleggen', icon: PiggyBank },
    { href: '/dashboard/financien/belasting', label: 'Belasting', icon: Receipt },
  ]

  const vrijVariant = balance > 0 ? 'success' : balance < 0 ? 'danger' : 'muted'

  return (
    <FeatureGuard feature="finance_module">
      <PageContainer>
        <SectionHeader title="Financiën" subtitle="Overzicht" />

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard title="Totaal salaris" value={loading ? '—' : `€ ${totalIncome.toFixed(2)}`} />
          <StatCard title="Totale vaste lasten" value={loading ? '—' : `€ ${vasteLasten.toFixed(2)}`} />
          <StatCard title="Vrij bedrag" value={loading ? '—' : `€ ${balance.toFixed(2)}`} variant={vrijVariant} />
        </div>

        <Card className="mt-8 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Secties</h2>
          <Accordion defaultValue="abonnementen">
            {SECTIONS.map(({ id, label }) => (
              <AccordionItem key={id} value={id}>
                <AccordionTrigger value={id}>{label}</AccordionTrigger>
                <AccordionContent value={id}>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {(entriesBySection[id] ?? []).length === 0 && (
                      <li className="text-slate-500">Geen items in deze sectie.</li>
                    )}
                    {(entriesBySection[id] ?? []).map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 last:border-0">
                        <span className="truncate">{entry.title}</span>
                        <span className="font-medium text-slate-900 shrink-0">€ {Number(entry.amount).toFixed(2)}</span>
                        <span className="text-slate-400 text-xs shrink-0">{entry.entry_date}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                          aria-label="Verwijderen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2 items-end">
                    <Input
                      placeholder="Omschrijving"
                      value={addForm.title}
                      onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-40"
                    />
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Bedrag"
                      value={addForm.amount}
                      onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-24"
                    />
                    <Input
                      type="date"
                      value={addForm.entry_date}
                      onChange={(e) => setAddForm((f) => ({ ...f, entry_date: e.target.value }))}
                      className="w-36"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => handleAddToSection(id)}
                      disabled={addingSection !== null || !addForm.title.trim() || !addForm.amount.trim()}
                    >
                      {addingSection === id ? 'Bezig…' : '+ Toevoegen'}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Snel naar</h2>
          <div className="grid grid-cols-2 gap-3">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4 text-slate-900 shadow-sm hover:shadow-md hover:border-[#2563eb]/30 transition-all duration-200"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2563eb]/10 text-[#2563eb]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-medium text-sm">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </PageContainer>
    </FeatureGuard>
  )
}
