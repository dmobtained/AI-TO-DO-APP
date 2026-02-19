"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { useDashboard } from '@/context/DashboardContext'
import { FeatureGuard } from '@/components/FeatureGuard'
import type { FinanceEntry } from '../components/types'
import { getMonthRange } from '../components/types'
import { BelastingSection } from '../components/BelastingSection'

export default function FinancienBelastingPage() {
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
      </div>
    )
  }

  return (
    <FeatureGuard feature="finance_module">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-slate-900">Belasting</h1>
        <p className="text-slate-500 text-sm mt-0.5">Belasting berekeningen</p>
        <div className="mt-6">
          <BelastingSection totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} />
        </div>
      </div>
    </FeatureGuard>
  )
}
