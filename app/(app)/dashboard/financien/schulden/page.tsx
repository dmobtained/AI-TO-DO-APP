'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { useToast } from '@/context/ToastContext'
import { FeatureGuard } from '@/components/FeatureGuard'
import { PageContainer } from '@/components/ui/PageContainer'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { CreditCard, Plus, Trash2, Sparkles } from 'lucide-react'
import { getMonthRange } from '../components/types'

// ========== DUMMY DATA (voor nu) ==========
type DummyDebt = {
  id: string
  name: string
  original_amount: number
  current_balance: number
  interest_rate: number | null
  monthly_payment: number
}

const DUMMY_DEBTS: DummyDebt[] = [
  { id: '1', name: 'ABN Studielening', original_amount: 12000, current_balance: 10500, interest_rate: 2.56, monthly_payment: 180 },
  { id: '2', name: 'Creditcard', original_amount: 3200, current_balance: 2800, interest_rate: 14.9, monthly_payment: 120 },
  { id: '3', name: 'Familielening', original_amount: 5000, current_balance: 4500, interest_rate: 0, monthly_payment: 100 },
]

// Scenario-uitkomsten (frontend dummy)
const DUMMY_SCENARIO_CURRENT = { endDate: '15-03-2028', totalInterest: 2840, months: 38 }
const DUMMY_SCENARIO_EXTRA_100 = { endDate: '22-11-2027', totalInterest: 2480, monthsSaved: 4, interestSaved: 360 }
const DUMMY_AI_PLACEHOLDER = { endDate: '—', totalInterest: '—', monthsSaved: '—', note: 'Wordt gevuld via AI' }

type AIAnalysisResponse = {
  actions?: string[]
  extraPerMonth?: number
  priorityDebt?: string
  newEndDate?: string
  riskAnalysis?: string
  error?: string
}

function formatDateDDMMYYYY(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const y = date.getFullYear()
  return `${d}-${m}-${y}`
}

export default function FinancienSchuldenPage() {
  const router = useRouter()
  const toast = useToast()
  const { user, loading: authLoading } = useDashboardUser()
  const [debts, setDebts] = useState<DummyDebt[]>(DUMMY_DEBTS)
  const [income, setIncome] = useState<number>(0)
  const [fixedExpenses, setFixedExpenses] = useState<number>(0)
  const [variableExpenses, setVariableExpenses] = useState<number>(0)
  const [cashflowLoading, setCashflowLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIAnalysisResponse | null>(null)
  const [form, setForm] = useState({
    name: '',
    original_amount: '',
    current_balance: '',
    interest_rate: '',
    monthly_payment: '',
  })

  const fetchCashflow = useCallback(async () => {
    if (!user?.id) return
    const supabase = getSupabaseClient()
    const { first, last } = getMonthRange()
    const [entriesRes, recurringRes] = await Promise.all([
      supabase
        .from('finance_entries')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('entry_date', first)
        .lte('entry_date', last),
      supabase
        .from('recurring_expenses')
        .select('amount')
        .eq('user_id', user.id)
        .eq('is_active', true),
    ])
    let inM = 0
    let exM = 0
    ;(entriesRes.data ?? []).forEach((row: { type: string; amount: string | number }) => {
      const n = Number(row.amount) || 0
      if (row.type === 'income') inM += n
      else exM += n
    })
    setIncome(inM)
    setVariableExpenses(exM)
    const fixed = (recurringRes.data ?? []).reduce((s: number, r: { amount: string | number }) => s + (Number(r.amount) || 0), 0)
    setFixedExpenses(fixed)
  }, [user?.id])

  useEffect(() => {
    if (authLoading || !user) return
    setCashflowLoading(true)
    fetchCashflow().finally(() => setCashflowLoading(false))
  }, [user, authLoading, fetchCashflow])

  // Berekeningen (frontend)
  const totalStart = debts.reduce((s, d) => s + d.original_amount, 0)
  const totalRemaining = debts.reduce((s, d) => s + d.current_balance, 0)
  const totalPaid = totalStart - totalRemaining
  const monthlyPaymentTotal = debts.reduce((s, d) => s + d.monthly_payment, 0)
  const estimatedMonths = monthlyPaymentTotal > 0 ? totalRemaining / monthlyPaymentTotal : 0
  const estimatedEndDate = new Date()
  estimatedEndDate.setMonth(estimatedEndDate.getMonth() + Math.ceil(estimatedMonths))

  const freeCashflow =
    income - fixedExpenses - variableExpenses - monthlyPaymentTotal
  const inControl = freeCashflow >= 0
  const avgMonthlyPayment =
    debts.length > 0 ? debts.reduce((s, d) => s + d.monthly_payment, 0) / debts.length : 0

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    const original = parseFloat(form.original_amount.replace(',', '.'))
    const current = parseFloat(form.current_balance.replace(',', '.'))
    const monthly = parseFloat(form.monthly_payment.replace(',', '.'))
    const rate = form.interest_rate.trim() ? parseFloat(form.interest_rate.replace(',', '.')) : null
    if (!name || Number.isNaN(original) || Number.isNaN(current) || Number.isNaN(monthly)) {
      toast('Vul naam, startbedrag, nog open en maandbedrag in', 'error')
      return
    }
    setAdding(true)
    setDebts((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name,
        original_amount: original,
        current_balance: current,
        interest_rate: Number.isNaN(rate!) || rate == null ? null : rate,
        monthly_payment: monthly,
      },
    ])
    setForm({ name: '', original_amount: '', current_balance: '', interest_rate: '', monthly_payment: '' })
    setShowForm(false)
    setAdding(false)
    toast('Schuld toegevoegd (dummy)')
  }

  const handleDelete = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id))
    if (expandedId === id) setExpandedId(null)
    toast('Verwijderd')
  }

  const handleAiOptimization = async () => {
    setAiLoading(true)
    setAiResponse(null)
    try {
      const res = await fetch('/api/webhook/ai-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'debt_analysis',
          debts: debts.map((d) => ({
            id: d.id,
            name: d.name,
            original_amount: d.original_amount,
            current_balance: d.current_balance,
            interest_rate: d.interest_rate,
            monthly_payment: d.monthly_payment,
          })),
          income,
          fixed_expenses: fixedExpenses,
          variable_expenses: variableExpenses,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAiResponse({ error: data?.error || 'AI-hub niet bereikbaar' })
        return
      }
      setAiResponse({
        actions: data.actions ?? ['Eerst hoogste rente aflossen (creditcard).', 'Daarna €50 extra op studielening.'],
        extraPerMonth: data.extraPerMonth ?? 50,
        priorityDebt: data.priorityDebt ?? 'Creditcard',
        newEndDate: data.newEndDate ?? formatDateDDMMYYYY(estimatedEndDate),
        riskAnalysis: data.riskAnalysis ?? 'Cashflow is positief; ruimte voor extra aflossing.',
      })
    } catch (err) {
      setAiResponse({ error: err instanceof Error ? err.message : 'Verzoek mislukt' })
    } finally {
      setAiLoading(false)
    }
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
        <SectionHeader
          title="Schulden"
          subtitle="Debt Intelligence Dashboard"
          action={
            <Button onClick={() => setShowForm((s) => !s)} className="w-full sm:w-auto min-h-[44px]">
              <Plus className="h-4 w-4 mr-2 shrink-0" /> {showForm ? 'Annuleren' : 'Schuld toevoegen'}
            </Button>
          }
        />

        {showForm && (
          <Card className="mt-6 p-4 sm:p-6">
            <form onSubmit={handleAdd} className="space-y-4">
              <Input
                placeholder="Naam schuldeiser"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Startbedrag (€)"
                  value={form.original_amount}
                  onChange={(e) => setForm((f) => ({ ...f, original_amount: e.target.value }))}
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Nog open (€)"
                  value={form.current_balance}
                  onChange={(e) => setForm((f) => ({ ...f, current_balance: e.target.value }))}
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
                <div>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Minimale betaling (€)"
                    value={form.monthly_payment}
                    onChange={(e) => setForm((f) => ({ ...f, monthly_payment: e.target.value }))}
                  />
                  <p className="text-xs text-textSecondary mt-1">Wat je maandelijks aflost</p>
                </div>
              </div>
              {(() => {
                const open = parseFloat(form.current_balance.replace(',', '.'))
                const perMonth = parseFloat(form.monthly_payment.replace(',', '.'))
                const valid = !Number.isNaN(open) && open > 0 && !Number.isNaN(perMonth) && perMonth > 0
                const months = valid ? Math.ceil(open / perMonth) : 0
                return valid && months > 0 ? (
                  <div className="rounded-[10px] bg-primarySoft border border-primary/20 p-3 sm:p-4">
                    <p className="text-sm text-textPrimary">
                      Bij <strong>€ {perMonth.toFixed(2)}</strong> per maand is je schuld over ca. <strong>{months} {months === 1 ? 'maand' : 'maanden'}</strong> weg.
                    </p>
                  </div>
                ) : null
              })()}
              <Button type="submit" disabled={adding}>Toevoegen</Button>
            </form>
          </Card>
        )}

        {/* 1️⃣ HOOFDBLOK – SCHULD STATUS */}
        <Card className="mt-6 sm:mt-8 p-4 sm:p-6">
          <CardHeader className="p-0 pb-4 border-0">
            <CardTitle className="text-base sm:text-lg">Overzicht schulden</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div>
                <p className="text-sm text-textSecondary mb-1">Totaal startbedrag</p>
                <p className="text-xl sm:text-2xl font-bold text-textPrimary tabular-nums">€ {totalStart.toLocaleString('nl-NL')}</p>
                <p className="text-sm text-textSecondary mt-2">Totaal afgelost</p>
                <p className="text-xl font-semibold text-textPrimary tabular-nums">€ {totalPaid.toLocaleString('nl-NL')}</p>
                <p className="text-sm text-textSecondary mt-2">Nog openstaand</p>
                <p className="text-xl font-semibold text-textPrimary tabular-nums">€ {totalRemaining.toLocaleString('nl-NL')}</p>
                <div className="mt-4">
                  <p className="text-sm text-textSecondary mb-1">€{totalPaid.toLocaleString('nl-NL')} van €{totalStart.toLocaleString('nl-NL')} afgelost</p>
                  <div className="h-2.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-[600ms] ease-out"
                      style={{ width: `${totalStart > 0 ? (totalPaid / totalStart) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-textSecondary">Gemiddelde maandaflossing</p>
                <p className="text-xl font-semibold text-textPrimary tabular-nums">€ {avgMonthlyPayment.toFixed(0)}</p>
                <p className="text-sm text-textSecondary mt-2">Geschatte einddatum</p>
                <p className="text-lg font-medium text-textPrimary tabular-nums">{formatDateDDMMYYYY(estimatedEndDate)}</p>
                <p className="text-sm text-textSecondary">Geschatte resterende maanden</p>
                <p className="text-lg font-medium text-textPrimary tabular-nums">{Math.ceil(estimatedMonths)} maanden</p>
                <div className="mt-4">
                  {inControl ? (
                    <Badge variant="success">In controle</Badge>
                  ) : (
                    <Badge variant="danger">Niet in controle</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2️⃣ STRATEGIE ANALYSE BLOK */}
        <Card className="mt-6 sm:mt-8 p-4 sm:p-6">
          <CardHeader className="p-0 pb-4 border-0">
            <CardTitle className="text-base sm:text-lg">Snelste pad naar schuldenvrij</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-[10px] bg-hover border border-border p-3 sm:p-4 min-h-[44px]">
                <p className="text-xs font-medium text-textSecondary uppercase tracking-wider mb-1 sm:mb-2 break-words">Scenario 1 – Huidig tempo</p>
                <p className="text-textPrimary font-medium">Einddatum {DUMMY_SCENARIO_CURRENT.endDate}</p>
                <p className="text-sm text-textSecondary mt-1">Totale rente €{DUMMY_SCENARIO_CURRENT.totalInterest.toLocaleString('nl-NL')}</p>
                <p className="text-sm text-textSecondary">{DUMMY_SCENARIO_CURRENT.months} maanden</p>
              </div>
              <div className="rounded-[10px] bg-hover border border-border p-3 sm:p-4 min-h-[44px]">
                <p className="text-xs font-medium text-textSecondary uppercase tracking-wider mb-1 sm:mb-2 break-words">Scenario 2 – + €100 extra per maand</p>
                <p className="text-textPrimary font-medium">Nieuwe einddatum {DUMMY_SCENARIO_EXTRA_100.endDate}</p>
                <p className="text-sm text-textSecondary mt-1">Totale rente €{DUMMY_SCENARIO_EXTRA_100.totalInterest.toLocaleString('nl-NL')}</p>
                <p className="text-sm text-success">{DUMMY_SCENARIO_EXTRA_100.monthsSaved} maanden sneller · €{DUMMY_SCENARIO_EXTRA_100.interestSaved} rente bespaard</p>
              </div>
              <div className="rounded-[10px] bg-hover border border-border p-3 sm:p-4 min-h-[44px]">
                <p className="text-xs font-medium text-textSecondary uppercase tracking-wider mb-1 sm:mb-2 break-words">Scenario 3 – Geoptimaliseerd (AI)</p>
                <p className="text-textPrimary font-medium">Einddatum {DUMMY_AI_PLACEHOLDER.endDate}</p>
                <p className="text-sm text-textSecondary">{DUMMY_AI_PLACEHOLDER.note}</p>
              </div>
            </div>
            <Button onClick={handleAiOptimization} disabled={aiLoading} className="w-full sm:w-auto min-h-[44px]">
              <Sparkles className="h-4 w-4 mr-2 shrink-0" />
              {aiLoading ? 'Bezig…' : 'Vraag AI om optimalisatieplan'}
            </Button>
          </CardContent>
        </Card>

        {/* 3️⃣ AI ANALYSE CARD (na response) */}
        {aiResponse && (
          <Card className="mt-6 sm:mt-8 p-4 sm:p-6 border-l-4 border-l-primary">
            <CardHeader className="p-0 pb-4 border-0">
              <CardTitle>AI Analyse</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {aiResponse.error ? (
                <p className="text-danger text-sm">{aiResponse.error}</p>
              ) : (
                <ul className="space-y-2 text-sm text-textPrimary">
                  {aiResponse.actions?.map((a, i) => (
                    <li key={i} className="flex gap-2"><span className="text-textSecondary">•</span>{a}</li>
                  ))}
                  {aiResponse.extraPerMonth != null && (
                    <li className="flex gap-2"><span className="text-textSecondary">Extra per maand:</span> €{aiResponse.extraPerMonth}</li>
                  )}
                  {aiResponse.priorityDebt && (
                    <li className="flex gap-2"><span className="text-textSecondary">Prioriteit schuld:</span> {aiResponse.priorityDebt}</li>
                  )}
                  {aiResponse.newEndDate && (
                    <li className="flex gap-2"><span className="text-textSecondary">Nieuwe einddatum:</span> {aiResponse.newEndDate}</li>
                  )}
                  {aiResponse.riskAnalysis && (
                    <li className="flex gap-2 mt-2"><span className="text-textSecondary">Risico:</span> {aiResponse.riskAnalysis}</li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* 4️⃣ SCHULDEN – mobiel: kaarten, desktop: tabel */}
        <div className="mt-6 sm:mt-8">
          <h2 className="text-base sm:text-lg font-semibold text-textPrimary mb-3 sm:mb-4">Schulden</h2>
          {debts.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Geen schulden"
              description="Voeg een schuld toe om overzicht en strategie te zien."
              className="mt-4"
            />
          ) : (
            <>
              {/* Mobiel: kaart per schuld */}
              <div className="md:hidden space-y-3">
                {debts.map((d, idx) => {
                  const interestPerMonth =
                    d.interest_rate != null && d.current_balance
                      ? (d.current_balance * d.interest_rate) / 100 / 12
                      : 0
                  const isHighInterest = d.interest_rate != null && d.interest_rate > 10
                  const isZeroInterest = d.interest_rate == null || d.interest_rate === 0
                  return (
                    <Card key={d.id} className="p-4">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-textPrimary truncate">{d.name}</p>
                          <p className="text-sm text-textSecondary mt-0.5">Nog open: € {d.current_balance.toLocaleString('nl-NL')}</p>
                          <p className="text-sm text-textSecondary">Min. betaling: € {d.monthly_payment.toFixed(2)} · Rente {d.interest_rate != null ? `${d.interest_rate}%` : '0%'}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {isHighInterest && <Badge variant="danger">Hoge rente</Badge>}
                            {isZeroInterest && <Badge variant="success">Rentevrij</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[10px] text-primary text-sm font-medium touch-manipulation"
                          >
                            {expandedId === d.id ? 'Sluiten' : 'Details'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(d.id)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[10px] text-textSecondary hover:bg-danger/10 hover:text-danger touch-manipulation"
                            aria-label="Verwijderen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {expandedId === d.id && (
                        <div className="mt-3 pt-3 border-t border-border text-sm text-textSecondary">
                          Start € {d.original_amount.toLocaleString('nl-NL')} · Rente/maand € {interestPerMonth.toFixed(2)} · Prioriteit {idx + 1}
                          <Button variant="ghost" className="mt-2 text-danger hover:bg-danger/10 text-sm" onClick={() => handleDelete(d.id)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Verwijderen
                          </Button>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
              {/* Desktop: tabel */}
              <div className="hidden md:block overflow-x-auto rounded-[14px] border border-border bg-card">
                <table className="w-full text-sm min-w-[800px]">
                  <thead className="bg-card border-b border-border">
                    <tr>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Schuldeiser</th>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Startbedrag</th>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Nog open</th>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Rente %</th>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Rente/maand</th>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Min. betaling</th>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Prioriteit</th>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Label</th>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Details</th>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-textSecondary uppercase tracking-wider w-20">Verwijderen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {debts.map((d, idx) => {
                      const interestPerMonth =
                        d.interest_rate != null && d.current_balance
                          ? (d.current_balance * d.interest_rate) / 100 / 12
                          : 0
                      const isHighInterest = d.interest_rate != null && d.interest_rate > 10
                      const isZeroInterest = d.interest_rate == null || d.interest_rate === 0
                      const priority = idx + 1
                      return (
                        <React.Fragment key={d.id}>
                          <tr className="hover:bg-hover transition-colors">
                            <td className="px-4 lg:px-6 py-3 sm:py-4 text-textPrimary font-medium">{d.name}</td>
                            <td className="px-4 lg:px-6 py-3 sm:py-4 text-textPrimary tabular-nums">€ {d.original_amount.toLocaleString('nl-NL')}</td>
                            <td className="px-4 lg:px-6 py-3 sm:py-4 text-textPrimary tabular-nums">€ {d.current_balance.toLocaleString('nl-NL')}</td>
                            <td className="px-4 lg:px-6 py-3 sm:py-4 text-textSecondary tabular-nums">{d.interest_rate != null ? `${d.interest_rate}%` : '—'}</td>
                            <td className="px-4 lg:px-6 py-3 sm:py-4 text-textSecondary tabular-nums">€ {interestPerMonth.toFixed(2)}</td>
                            <td className="px-4 lg:px-6 py-3 sm:py-4 text-textPrimary tabular-nums">€ {d.monthly_payment.toFixed(2)}</td>
                            <td className="px-4 lg:px-6 py-3 sm:py-4 text-textSecondary tabular-nums">{priority}</td>
                            <td className="px-4 lg:px-6 py-3 sm:py-4">
                              {isHighInterest && <Badge variant="danger">Hoge rente (&gt;10%)</Badge>}
                              {isZeroInterest && <Badge variant="success">Rentevrij</Badge>}
                              {!isHighInterest && !isZeroInterest && <span className="text-textSecondary">—</span>}
                            </td>
                            <td className="px-4 lg:px-6 py-3 sm:py-4">
                              <button
                                type="button"
                                onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                                className="text-primary hover:underline text-sm font-medium min-h-[44px] min-w-[44px] inline-flex items-center"
                              >
                                {expandedId === d.id ? 'Sluiten' : 'Details'}
                              </button>
                            </td>
                            <td className="px-4 lg:px-6 py-3 sm:py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleDelete(d.id)}
                                className="rounded-[10px] p-2.5 text-textSecondary hover:bg-danger/10 hover:text-danger transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                                aria-label="Schuld verwijderen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                          {expandedId === d.id && (
                            <tr>
                              <td colSpan={10} className="px-4 lg:px-6 py-3 sm:py-4 bg-hover border-b border-border">
                                <div className="text-sm text-textSecondary">
                                  Betalingshistorie en simulatie komen hier (dummy).
                                  <Button variant="ghost" className="ml-2 text-danger hover:bg-danger/10" onClick={() => handleDelete(d.id)}>
                                    <Trash2 className="h-4 w-4 mr-1" /> Verwijderen
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* 5️⃣ CASHFLOW REALITY BLOK */}
        <Card className="mt-6 sm:mt-8 p-4 sm:p-6">
          <CardHeader className="p-0 pb-4 border-0">
            <CardTitle>Maandelijkse realiteit</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {cashflowLoading ? (
              <div className="h-24 rounded-[10px] bg-hover animate-pulse" />
            ) : (
              <>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-textSecondary">Inkomen</span><span className="tabular-nums text-textPrimary">€ {income.toLocaleString('nl-NL')}</span></li>
              <li className="flex justify-between"><span className="text-textSecondary">Vaste lasten</span><span className="tabular-nums text-textPrimary">€ {fixedExpenses.toLocaleString('nl-NL')}</span></li>
              <li className="flex justify-between"><span className="text-textSecondary">Variabele uitgaven</span><span className="tabular-nums text-textPrimary">€ {variableExpenses.toLocaleString('nl-NL')}</span></li>
              <li className="flex justify-between"><span className="text-textSecondary">Minimale schuldbetalingen</span><span className="tabular-nums text-textPrimary">€ {monthlyPaymentTotal.toLocaleString('nl-NL')}</span></li>
            </ul>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-textSecondary">Vrij om af te lossen</p>
              <p className={`text-xl font-bold tabular-nums ${freeCashflow >= 0 ? 'text-textPrimary' : 'text-danger'}`}>
                € {freeCashflow.toFixed(0)}
              </p>
            </div>
            {freeCashflow < 0 && (
              <div className="mt-4 rounded-[10px] bg-danger/10 border border-danger/30 p-4">
                <p className="text-sm font-medium text-danger">
                  Je cashflow is negatief. Extra aflossen wordt afgeraden.
                </p>
              </div>
            )}
              </>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </FeatureGuard>
  )
}
