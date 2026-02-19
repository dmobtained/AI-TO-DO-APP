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
import type { FinanceEntry } from './components/types'
import { getMonthRange } from './components/types'
import { Building2, CreditCard, PiggyBank, Receipt } from 'lucide-react'

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
  const { user, loading: authLoading } = useDashboardUser()
  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [loading, setLoading] = useState(true)
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
      return
    }
    const list = Array.isArray(data) ? data : (data ? [data] : [])
    setEntries(list as FinanceEntry[])
  }, [user?.id, first, last])

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

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="h-8 w-48 rounded bg-white/10 animate-pulse" />
        <div className="mt-4 h-4 w-64 rounded bg-white/10 animate-pulse" />
      </div>
    )
  }

  const links = [
    { href: '/dashboard/financien/bank', label: 'Bank saldo', icon: CreditCard },
    { href: '/dashboard/financien/lasten', label: 'Vaste lasten', icon: Building2 },
    { href: '/dashboard/financien/beleggen', label: 'Beleggen', icon: PiggyBank },
    { href: '/dashboard/financien/belasting', label: 'Belasting', icon: Receipt },
  ]

  return (
    <FeatureGuard feature="finance_module">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-white">Financiën</h1>
        <p className="text-white/70 text-sm mt-0.5">Overzicht</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="p-6">
            <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Totaal salaris</p>
            <p className="text-2xl font-bold text-white mt-1">{loading ? '—' : `€ ${totalIncome.toFixed(2)}`}</p>
          </Card>
          <Card className="p-6">
            <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Totale vaste lasten</p>
            <p className="text-2xl font-bold text-white mt-1">{loading ? '—' : `€ ${vasteLasten.toFixed(2)}`}</p>
          </Card>
          <Card className="p-6">
            <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Vrij bedrag</p>
            <p className="text-2xl font-bold text-white mt-1">{loading ? '—' : `€ ${balance.toFixed(2)}`}</p>
          </Card>
        </div>

        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Secties</h2>
          <Accordion defaultValue="abonnementen">
            {SECTIONS.map(({ id, label }) => (
              <AccordionItem key={id} value={id}>
                <AccordionTrigger value={id}>{label}</AccordionTrigger>
                <AccordionContent value={id}>
                  <ul className="space-y-2 text-sm text-white/80">
                    <li>Placeholder item 1</li>
                    <li>Placeholder item 2</li>
                  </ul>
                  <Button variant="secondary" className="mt-3">+ Toevoegen</Button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Snel naar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#171a21] p-4 text-white hover:bg-white/5 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3b82f6]/20 text-[#3b82f6">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </FeatureGuard>
  )
}
