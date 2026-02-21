'use client'
export const dynamic = 'force-dynamic'

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
import { Receipt, Plus, Trash2, Pause, Play } from 'lucide-react'

type RecurringExpense = {
  id: string
  user_id: string
  title: string
  amount: number
  day_of_month: number
  is_active: boolean
  created_at: string
}

export default function FinancienLastenPage() {
  const router = useRouter()
  const toast = useToast()
  const { user, loading: authLoading } = useDashboardUser()
  const [items, setItems] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', amount: '', day_of_month: '1' })

  const fetchItems = useCallback(async () => {
    if (!user?.id) return
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('id, user_id, title, amount, day_of_month, is_active, created_at')
      .eq('user_id', user.id)
      .order('day_of_month', { ascending: true })
    if (error) {
      toast(error.message || 'Vaste lasten laden mislukt', 'error')
      setItems([])
      return
    }
    setItems((data ?? []).map((r) => ({ ...r, amount: Number(r.amount), day_of_month: Number(r.day_of_month) })) as RecurringExpense[])
  }, [user?.id, toast])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/')
      return
    }
    setLoading(true)
    fetchItems().finally(() => setLoading(false))
  }, [user, authLoading, router, fetchItems])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    const title = form.title.trim()
    const amount = parseFloat(form.amount.replace(',', '.'))
    const day = parseInt(form.day_of_month, 10)
    if (!title || Number.isNaN(amount) || amount < 0 || day < 1 || day > 31) {
      toast('Vul een omschrijving, bedrag (≥ 0) en dag (1–31) in', 'error')
      return
    }
    setAdding(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('recurring_expenses').insert({
      user_id: user.id,
      title,
      amount,
      day_of_month: day,
      is_active: true,
    })
    setAdding(false)
    if (error) {
      toast(error.message || 'Toevoegen mislukt', 'error')
      return
    }
    toast('Vaste last toegevoegd')
    setForm({ title: '', amount: '', day_of_month: '1' })
    setShowForm(false)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (!user?.id) return
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('recurring_expenses').delete().eq('id', id).eq('user_id', user.id)
    if (error) {
      toast(error.message || 'Verwijderen mislukt', 'error')
      return
    }
    toast('Verwijderd')
    fetchItems()
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    if (!user?.id) return
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('recurring_expenses')
      .update({ is_active: !current })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) {
      toast(error.message || 'Bijwerken mislukt', 'error')
      return
    }
    toast(current ? 'Gepauzeerd' : 'Geactiveerd')
    fetchItems()
  }

  const totalActive = items.filter((i) => i.is_active).reduce((s, i) => s + i.amount, 0)

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
        <SectionHeader
          title="Vaste lasten"
          subtitle="Beheer vaste lasten"
        />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-textSecondary">
            Totaal actieve vaste lasten: <span className="font-semibold text-textPrimary">€ {totalActive.toLocaleString('nl-NL')}</span>
          </p>
          <Button onClick={() => setShowForm((v) => !v)} className="min-h-[44px]">
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            {showForm ? 'Annuleren' : 'Vaste last toevoegen'}
          </Button>
        </div>

        {showForm && (
          <Card className="mt-6 p-4 sm:p-6">
            <CardContent className="p-0">
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label htmlFor="lasten-title" className="block text-sm font-medium text-textPrimary mb-1">Omschrijving</label>
                  <Input
                    id="lasten-title"
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Bijv. Huur, Verzekering"
                    disabled={adding}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lasten-amount" className="block text-sm font-medium text-textPrimary mb-1">Bedrag per maand (€)</label>
                    <Input
                      id="lasten-amount"
                      type="text"
                      inputMode="decimal"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="0"
                      disabled={adding}
                    />
                  </div>
                  <div>
                    <label htmlFor="lasten-day" className="block text-sm font-medium text-textPrimary mb-1">Dag van de maand (1–31)</label>
                    <Input
                      id="lasten-day"
                      type="number"
                      min={1}
                      max={31}
                      value={form.day_of_month}
                      onChange={(e) => setForm((f) => ({ ...f, day_of_month: e.target.value }))}
                      disabled={adding}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={adding}>
                  {adding ? 'Bezig…' : 'Toevoegen'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="mt-8">
          {loading ? (
            <div className="h-32 rounded-[14px] bg-hover animate-pulse" />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Geen vaste lasten"
              description="Voeg een vaste last toe om je maandelijkse lasten bij te houden."
            />
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 ${!item.is_active ? 'opacity-60' : ''}`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-textPrimary truncate">{item.title}</p>
                        <p className="text-sm text-textSecondary">
                          € {item.amount.toLocaleString('nl-NL')}/maand · dag {item.day_of_month}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleToggleActive(item.id, item.is_active)}
                          className="min-w-[44px] min-h-[44px] p-2"
                          aria-label={item.is_active ? 'Pauzeren' : 'Activeren'}
                        >
                          {item.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleDelete(item.id)}
                          className="min-w-[44px] min-h-[44px] p-2 text-danger hover:bg-danger/10"
                          aria-label="Verwijderen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </FeatureGuard>
  )
}
