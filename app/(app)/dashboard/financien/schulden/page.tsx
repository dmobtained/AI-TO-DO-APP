'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { useToast } from '@/context/ToastContext'
import { FeatureGuard } from '@/components/FeatureGuard'
import { PageContainer } from '@/components/ui/PageContainer'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { CreditCard, Plus, Trash2 } from 'lucide-react'

type Debt = {
  id: string
  user_id: string
  name: string
  total_amount: number
  interest_rate: number | null
  monthly_payment: number
  start_date: string | null
  created_at: string
}

export default function FinancienSchuldenPage() {
  const router = useRouter()
  const toast = useToast()
  const { user, loading: authLoading } = useDashboardUser()
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    name: '',
    total_amount: '',
    interest_rate: '',
    monthly_payment: '',
    start_date: '',
  })

  const fetchDebts = useCallback(async () => {
    if (!user?.id) return
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('debts')
      .select('id, user_id, name, total_amount, interest_rate, monthly_payment, start_date, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      toast(error.message, 'error')
      setDebts([])
      return
    }
    setDebts((data ?? []).map((d) => ({ ...d, total_amount: Number(d.total_amount), interest_rate: d.interest_rate != null ? Number(d.interest_rate) : null, monthly_payment: Number(d.monthly_payment) })) as Debt[])
  }, [user?.id, toast])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/')
      return
    }
    setLoading(true)
    fetchDebts().finally(() => setLoading(false))
  }, [user, authLoading, router, fetchDebts])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    const name = form.name.trim()
    const total_amount = parseFloat(form.total_amount.replace(',', '.'))
    const monthly_payment = parseFloat(form.monthly_payment.replace(',', '.'))
    if (!name || Number.isNaN(total_amount) || total_amount < 0 || Number.isNaN(monthly_payment) || monthly_payment < 0) {
      toast('Vul naam, totaalbedrag en maandbedrag in', 'error')
      return
    }
    setAdding(true)
    const supabase = getSupabaseClient()
    const interest_rate = form.interest_rate.trim() ? parseFloat(form.interest_rate.replace(',', '.')) : null
    const start_date = form.start_date.trim() || null
    const { error } = await supabase.from('debts').insert({
      user_id: user.id,
      name,
      total_amount,
      interest_rate: interest_rate != null && !Number.isNaN(interest_rate) ? interest_rate : null,
      monthly_payment,
      start_date: start_date || null,
    })
    setAdding(false)
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast('Schuld toegevoegd')
    setForm({ name: '', total_amount: '', interest_rate: '', monthly_payment: '', start_date: '' })
    setShowForm(false)
    fetchDebts()
  }

  const handleDelete = async (id: string) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('debts').delete().eq('id', id).eq('user_id', user!.id)
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast('Verwijderd')
    fetchDebts()
  }

  if (authLoading || !user) {
    return (
      <PageContainer>
        <div className="h-8 w-48 rounded bg-slate-200 animate-pulse" />
      </PageContainer>
    )
  }

  return (
    <FeatureGuard feature="finance_module">
      <PageContainer>
        <SectionHeader
          title="Schulden"
          subtitle="Overzicht en maandbedragen"
          action={
            <Button onClick={() => setShowForm((s) => !s)}>
              <Plus className="h-4 w-4 mr-2" /> {showForm ? 'Annuleren' : 'Schuld toevoegen'}
            </Button>
          }
        />

        {showForm && (
          <Card className="mt-6 p-6">
            <form onSubmit={handleAdd} className="space-y-4">
              <Input
                placeholder="Naam (bijv. bank of lening)"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Totaalbedrag (€)"
                  value={form.total_amount}
                  onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Maandbedrag (€)"
                  value={form.monthly_payment}
                  onChange={(e) => setForm((f) => ({ ...f, monthly_payment: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Rente % (optioneel)"
                  value={form.interest_rate}
                  onChange={(e) => setForm((f) => ({ ...f, interest_rate: e.target.value }))}
                />
                <Input
                  type="date"
                  placeholder="Startdatum (optioneel)"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={adding}>Toevoegen</Button>
            </form>
          </Card>
        )}

        {loading ? (
          <div className="mt-6 h-32 rounded-xl bg-slate-100 animate-pulse" />
        ) : debts.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Geen schulden"
            description="Voeg een schuld toe om maandelijkse betalingen te volgen. Er wordt automatisch een taak aangemaakt."
            className="mt-8"
          />
        ) : (
          <ul className="mt-6 space-y-3">
            {debts.map((d) => (
              <li key={d.id}>
                <Card>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{d.name}</p>
                      <p className="text-sm text-slate-500">
                        Totaal € {d.total_amount.toFixed(2)} · € {d.monthly_payment.toFixed(2)}/maand
                        {d.interest_rate != null && ` · ${d.interest_rate}% rente`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(d.id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                      aria-label="Verwijderen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </FeatureGuard>
  )
}
