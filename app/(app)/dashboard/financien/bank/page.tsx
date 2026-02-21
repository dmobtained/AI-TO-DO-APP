"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { useToast } from '@/context/ToastContext'
import { useDashboard } from '@/context/DashboardContext'
import { FeatureGuard } from '@/components/FeatureGuard'
import type { FinanceEntry } from '../components/types'
import { getMonthRange } from '../components/types'
import { BankzaldoSection } from '../components/BankzaldoSection'
import { PageContainer } from '@/components/ui/PageContainer'

export default function FinancienBankPage() {
  const supabase = getSupabaseClient()
  const router = useRouter()
  const { user, loading: authLoading } = useDashboardUser()
  const { canSee, isAdmin } = useDashboard()
  const toast = useToast()
  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    type: 'income' as 'income' | 'expense',
    title: '',
    amount: '',
    entry_date: new Date().toISOString().slice(0, 10),
  })
  const [adding, setAdding] = useState(false)
  const { first, last } = useMemo(() => getMonthRange(), [])

  const fetchEntries = useCallback(async () => {
    if (!user?.id) return
    setError(null)
    const { data, error: err } = await supabase
      .from('finance_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', first)
      .lte('entry_date', last)
      .order('entry_date', { ascending: false })
    if (err) {
      setError(err.message)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !form.title.trim() || !form.amount.trim()) return
    setAdding(true)
    setError(null)
    try {
      const { error: insertError } = await supabase.from('finance_entries').insert({
        user_id: user.id,
        type: form.type,
        title: form.title.trim(),
        amount: form.amount.trim(),
        entry_date: form.entry_date,
      })
      if (insertError) {
        setError(insertError.message)
        toast(insertError.message, 'error')
        return
      }
      setForm({ type: 'income', title: '', amount: '', entry_date: new Date().toISOString().slice(0, 10) })
      toast('Entry toegevoegd')
      await fetchEntries()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Er is iets misgegaan'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteEntry = async (entry: FinanceEntry) => {
    if (!user?.id) return
    const { error: delErr } = await supabase
      .from('finance_entries')
      .delete()
      .eq('id', entry.id)
      .eq('user_id', user.id)
    if (delErr) {
      toast(delErr.message, 'error')
      return
    }
    toast('Verwijderd')
    await fetchEntries()
  }

  if (authLoading || !user) {
    return (
      <PageContainer>
        <div className="h-8 w-48 rounded bg-hover animate-pulse" />
      </PageContainer>
    )
  }

  return (
    <FeatureGuard feature="finance_module">
      <PageContainer>
        <h1 className="text-2xl font-semibold text-textPrimary">Bank saldo</h1>
        <p className="text-textSecondary text-sm mt-0.5">Inkomsten en uitgaven deze maand</p>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="mt-6">
          <BankzaldoSection
            entries={entries}
            loading={loading}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            balance={balance}
            user={{ id: user.id }}
            toast={toast}
            onSubmitNewEntry={handleSubmit}
            onDeleteEntry={handleDeleteEntry}
            form={form}
            setForm={setForm}
            adding={adding}
            canSee={canSee as (feature: string) => boolean}
            isAdmin={isAdmin ?? false}
          />
        </div>
      </PageContainer>
    </FeatureGuard>
  )
}
