'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/browser'
import type { FinanceEntry } from './types'
import { formatDate, savingsBalance, SAVINGS_PREFIX, SAVINGS_WITHDRAW_PREFIX, SAVINGS_RATE_KEY } from './types'

export type SavingsSectionProps = {
  userId: string
  savingsEntries: FinanceEntry[]
  vrijBesteedbaar: number
  totalExpense: number
  toast: (m: string, t?: 'success' | 'error' | 'info') => void
  onRefresh: () => Promise<void>
}

export function SavingsSection({ userId, savingsEntries, vrijBesteedbaar, totalExpense, toast, onRefresh }: SavingsSectionProps) {
  const [depositAmount, setDepositAmount] = useState('')
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10))
  const [depositNote, setDepositNote] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().slice(0, 10))
  const [withdrawNote, setWithdrawNote] = useState('')
  const [rateInput, setRateInput] = useState('0.00')
  const [submitting, setSubmitting] = useState<'deposit' | 'withdraw' | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVINGS_RATE_KEY + userId)
      if (stored != null) setRateInput(stored)
    } catch {
      // ignore
    }
  }, [userId])

  const balance = useMemo(() => savingsBalance(savingsEntries), [savingsEntries])
  const lastFive = useMemo(() => savingsEntries.slice(0, 5), [savingsEntries])

  const rate = useMemo(() => {
    const n = parseFloat(rateInput.replace(',', '.'))
    return Number.isNaN(n) || n < 0 ? 0 : n
  }, [rateInput])

  const rentePerJaar = balance * (rate / 100)
  const eindbedragJaar = balance + rentePerJaar
  const rentePerMaand = rentePerJaar / 12

  useEffect(() => {
    try {
      localStorage.setItem(SAVINGS_RATE_KEY + userId, rateInput)
    } catch {
      // ignore
    }
  }, [userId, rateInput])

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(depositAmount.replace(',', '.'))
    if (Number.isNaN(amount) || amount <= 0) {
      toast('Voer een geldig bedrag in', 'error')
      return
    }
    setSubmitting('deposit')
    try {
      const { error } = await supabase.from('finance_entries').insert({
        user_id: userId,
        type: 'expense',
        title: depositNote.trim() ? `${SAVINGS_PREFIX} ${depositNote.trim()}` : `${SAVINGS_PREFIX} ING storting`,
        amount: String(amount),
        entry_date: depositDate,
      })
      if (error) {
        toast(error.message, 'error')
        return
      }
      toast('Spaarstorting toegevoegd')
      setDepositAmount('')
      setDepositDate(new Date().toISOString().slice(0, 10))
      setDepositNote('')
      await onRefresh()
    } finally {
      setSubmitting(null)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(withdrawAmount.replace(',', '.'))
    if (Number.isNaN(amount) || amount <= 0) {
      toast('Voer een geldig bedrag in', 'error')
      return
    }
    setSubmitting('withdraw')
    try {
      const { error } = await supabase.from('finance_entries').insert({
        user_id: userId,
        type: 'income',
        title: withdrawNote.trim() ? `${SAVINGS_WITHDRAW_PREFIX} ${withdrawNote.trim()}` : `${SAVINGS_WITHDRAW_PREFIX} Onttrekking`,
        amount: String(amount),
        entry_date: withdrawDate,
      })
      if (error) {
        toast(error.message, 'error')
        return
      }
      toast('Onttrekking toegevoegd')
      setWithdrawAmount('')
      setWithdrawDate(new Date().toISOString().slice(0, 10))
      setWithdrawNote('')
      await onRefresh()
    } finally {
      setSubmitting(null)
    }
  }

  const handleDeleteSavings = async (entry: FinanceEntry) => {
    const { error } = await supabase.from('finance_entries').delete().eq('id', entry.id).eq('user_id', userId)
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast('Verwijderd')
    await onRefresh()
  }

  const handleRateChange = (value: string) => {
    if (value === '' || /^\d*[,.]?\d*$/.test(value)) setRateInput(value)
  }

  const bufferBedrag = totalExpense > 0 ? totalExpense * 3 : 0
  const suggesties = useMemo(() => {
    const list: { text: string; waarom: string }[] = []
    if (vrijBesteedbaar < 0) {
      list.push({ text: 'Focus op buffer opbouwen en kosten verlagen.', waarom: 'Je maand saldo is negatief.' })
      list.push({ text: 'Vermijd risicovolle investeringen tot je buffer op orde is.', waarom: 'Eerst stabiliteit.' })
    }
    if (balance < bufferBedrag && bufferBedrag > 0) {
      list.push({
        text: `Streef naar een noodbuffer van 3–6 maanden vaste lasten (≈ € ${bufferBedrag.toFixed(0)} bij 3 maanden).`,
        waarom: 'Dan kun je tegenslagen opvangen.',
      })
    }
    if (balance >= bufferBedrag && bufferBedrag > 0 && vrijBesteedbaar > 0) {
      list.push({
        text: 'Overweeg periodiek beleggen (bijv. indexfonds/ETF) met een klein percentage van je overschot.',
        waarom: 'Lange termijn rendement na buffer.',
      })
      list.push({
        text: 'Extra aflossen op schulden vermindert rentelast.',
        waarom: 'Algemene optie als je leningen hebt.',
      })
      list.push({
        text: 'Investeren in eigen skills of bedrijfsmiddelen (opleiding, tooling).',
        waarom: 'Verhoogt inkomen of bespaart kosten.',
      })
    }
    if (list.length === 0 && balance === 0) {
      list.push({ text: 'Begin met kleine vaste stortingen om een buffer op te bouwen.', waarom: 'Consistentie helpt.' })
    }
    return list.slice(0, 5)
  }, [balance, vrijBesteedbaar, bufferBedrag, totalExpense])

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">ING Sparen</h2>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
        <p className="text-sm font-medium text-slate-700">Spaarsaldo</p>
        <p className="text-2xl font-semibold text-emerald-700">€ {balance.toFixed(2)}</p>
        <p className="text-xs text-slate-500 mt-1">Berekend uit finance entries met prefix [SAVINGS]</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Storting</h3>
          <form onSubmit={handleDeposit} className="space-y-3">
            <input
              type="text"
              inputMode="decimal"
              value={depositAmount}
              onChange={(e) => { if (e.target.value === '' || /^\d*[,.]?\d*$/.test(e.target.value)) setDepositAmount(e.target.value) }}
              placeholder="Bedrag (€)"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
              placeholder="Notitie (optioneel)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button type="submit" disabled={submitting !== null} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {submitting === 'deposit' ? 'Bezig…' : 'Storting toevoegen'}
            </button>
          </form>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Onttrekking</h3>
          <form onSubmit={handleWithdraw} className="space-y-3">
            <input
              type="text"
              inputMode="decimal"
              value={withdrawAmount}
              onChange={(e) => { if (e.target.value === '' || /^\d*[,.]?\d*$/.test(e.target.value)) setWithdrawAmount(e.target.value) }}
              placeholder="Bedrag (€)"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={withdrawDate}
              onChange={(e) => setWithdrawDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={withdrawNote}
              onChange={(e) => setWithdrawNote(e.target.value)}
              placeholder="Notitie (optioneel)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button type="submit" disabled={submitting !== null} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {submitting === 'withdraw' ? 'Bezig…' : 'Onttrekking toevoegen'}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-2">Laatste 5 spaar-transacties</h3>
        {lastFive.length === 0 ? (
          <p className="text-slate-500 text-sm">Nog geen stortingen of onttrekkingen.</p>
        ) : (
          <ul className="space-y-2">
            {lastFive.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 text-sm py-1 border-b border-slate-100">
                <span className="text-slate-700">
                  {formatDate(entry.entry_date)} — {(entry.title || '').replace(SAVINGS_PREFIX, '').replace(SAVINGS_WITHDRAW_PREFIX, '').trim() || (entry.type === 'expense' ? 'Storting' : 'Onttrekking')}
                </span>
                <span className={entry.type === 'expense' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}>
                  {entry.type === 'expense' ? '+' : '−'} € {(Number(entry.amount) || 0).toFixed(2)}
                </span>
                <button type="button" onClick={() => handleDeleteSavings(entry)} className="text-red-600 hover:underline text-xs">Verwijderen</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-2">Spaarrente (% per jaar)</h3>
        <p className="text-xs text-slate-500 mb-2">Opgeslagen per gebruiker in localStorage.</p>
        <input
          type="text"
          inputMode="decimal"
          value={rateInput}
          onChange={(e) => handleRateChange(e.target.value)}
          placeholder="0.00"
          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded border border-slate-200 p-3">
            <p className="text-slate-500">Jaarlijkse rente</p>
            <p className="font-semibold text-slate-900">€ {rentePerJaar.toFixed(2)}</p>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-slate-500">Eindbedrag na 1 jaar</p>
            <p className="font-semibold text-slate-900">€ {eindbedragJaar.toFixed(2)}</p>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-slate-500">≈ per maand</p>
            <p className="font-semibold text-slate-900">€ {rentePerMaand.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-2">Suggesties — buffer / investeren / aflossen</h3>
        <p className="text-xs text-slate-500 mb-2">Geen financieel advies; praktische opties op basis van je gegevens.</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
          {suggesties.map((s, i) => (
            <li key={i}><strong>{s.text}</strong> {s.waarom}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
