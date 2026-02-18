'use client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/browser'
import { useAuth } from '@/context/AuthProvider'
import { useDashboard } from '@/context/DashboardContext'
import { FeatureGuard } from '@/components/FeatureGuard'
import type { FinanceEntry } from './components/types'
import { getMonthRange } from './components/types'
import { Building2, CreditCard, PiggyBank, Receipt } from 'lucide-react'

export default function FinancienOverviewPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
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

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="h-8 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="mt-4 h-4 w-64 rounded bg-slate-200 animate-pulse" />
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
        <h1 className="text-2xl font-semibold text-slate-900">Financiën</h1>
        <p className="text-slate-500 text-sm mt-0.5">Overzicht</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Inkomsten deze maand</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '—' : `€ ${totalIncome.toFixed(2)}`}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Uitgaven deze maand</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '—' : `€ ${totalExpense.toFixed(2)}`}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Saldo</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '—' : `€ ${balance.toFixed(2)}`}</p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Secties</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-slate-700 hover:bg-slate-50 hover:border-blue-200 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
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
