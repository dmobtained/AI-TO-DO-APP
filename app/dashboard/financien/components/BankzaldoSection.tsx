'use client'

import { useState, useEffect } from 'react'
import type { FinanceEntry } from './types'
import { formatDate } from './types'

const FINANCE_NEWS_CACHE_KEY = 'finance_news_cache'
const FINANCE_NEWS_TTL_MS = 30 * 60 * 1000
const CHAT_STORAGE_KEY = 'finance_chat_messages'

type ChatMessage = { role: 'user' | 'assistant'; text: string }

function SummaryCard({ title, value, variant }: { title: string; value: string; variant: 'income' | 'expense' | 'balance' }) {
  const bg = variant === 'income' ? 'bg-emerald-50' : variant === 'expense' ? 'bg-red-50' : 'bg-slate-50'
  const text = variant === 'income' ? 'text-emerald-700' : variant === 'expense' ? 'text-red-700' : 'text-slate-700'
  return (
    <div className={`rounded-xl border border-slate-200 ${bg} p-4`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
      <p className={`text-xl font-semibold ${text} mt-1`}>{value}</p>
    </div>
  )
}

function QuickActionCanPay({ balance, toast }: { balance: number; toast: (m: string, t?: 'success' | 'error' | 'info') => void }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const canPay = amount !== '' && !Number.isNaN(Number(amount)) && balance >= Number(amount)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm bg-white hover:bg-slate-50"
      >
        Kan ik dit betalen?
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-900 mb-2">Kan ik dit betalen?</h3>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Bedrag"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 mb-4"
            />
            <p className="text-sm text-slate-600 mb-4">
              Vrij besteedbaar: € {balance.toFixed(2)}. {amount ? (canPay ? 'Ja, dat kan.' : 'Nee, dat is te veel.') : ''}
            </p>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-slate-200 px-3 py-1.5 text-sm hover:bg-slate-300">Sluiten</button>
          </div>
        </div>
      )}
    </>
  )
}

function QuickActionSpendToday({ balance, toast }: { balance: number; toast: (m: string, t?: 'success' | 'error' | 'info') => void }) {
  const perDay = balance / 30
  return (
    <button
      type="button"
      onClick={() => toast(`Ongeveer € ${perDay.toFixed(2)} per dag te besteden (vrij besteedbaar / 30)`, 'info')}
      className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm bg-white hover:bg-slate-50"
    >
      Wat kan ik vandaag uitgeven?
    </button>
  )
}

function QuickActionWhereMoney({ entries, toast }: { entries: FinanceEntry[]; toast: (m: string, t?: 'success' | 'error' | 'info') => void }) {
  const byKeyword = new Map<string, number>()
  entries.filter((e) => e.type === 'expense').forEach((e) => {
    const kw = (e.title || '').trim().split(/\s+/)[0] || 'Overig'
    byKeyword.set(kw, (byKeyword.get(kw) ?? 0) + (Number(e.amount) || 0))
  })
  const top = [...byKeyword.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  const msg = top.length ? `Top: ${top.map(([k, v]) => `${k} €${v.toFixed(2)}`).join(', ')}` : 'Nog geen uitgaven'
  return (
    <button
      type="button"
      onClick={() => toast(msg, 'info')}
      className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm bg-white hover:bg-slate-50"
    >
      Waar gaat mijn geld heen?
    </button>
  )
}

function FinanceAiNewsBlock({ isAdminOrDev }: { isAdminOrDev: boolean }) {
  const [text, setText] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [cachedAt, setCachedAt] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FINANCE_NEWS_CACHE_KEY)
      if (!raw) return
      const { text: t, at } = JSON.parse(raw) as { text: string; at: number }
      if (Date.now() - at < FINANCE_NEWS_TTL_MS) {
        setText(t || '')
        setCachedAt(at)
      }
    } catch {
      // ignore
    }
  }, [])

  const refresh = async () => {
    const url = process.env.NEXT_PUBLIC_N8N_FINANCE_NEWS_WEBHOOK
    if (!url) {
      setText('Webhook niet geconfigureerd (NEXT_PUBLIC_N8N_FINANCE_NEWS_WEBHOOK).')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.text()
      setText(data || 'Geen inhoud.')
      const at = Date.now()
      setCachedAt(at)
      try {
        localStorage.setItem(FINANCE_NEWS_CACHE_KEY, JSON.stringify({ text: data, at }))
      } catch {
        // ignore
      }
    } catch {
      setText('Kon nieuws niet laden. Controleer de webhook.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
      <h2 className="text-sm font-semibold text-slate-900 mb-2">Laatste financiële update NL</h2>
      {(isAdminOrDev || (typeof window !== 'undefined' && localStorage.getItem('devmode') === 'true')) && (
        <button type="button" onClick={refresh} disabled={loading} className="mb-3 rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Bezig…' : 'Vernieuwen'}
        </button>
      )}
      {!process.env.NEXT_PUBLIC_N8N_FINANCE_NEWS_WEBHOOK && (
        <p className="text-slate-500 text-sm">Webhook niet ingesteld. Configureer NEXT_PUBLIC_N8N_FINANCE_NEWS_WEBHOOK.</p>
      )}
      {process.env.NEXT_PUBLIC_N8N_FINANCE_NEWS_WEBHOOK && (
        <div className="min-h-[80px] rounded border border-slate-200 p-3 text-sm text-slate-700 whitespace-pre-wrap">
          {text || (cachedAt ? 'Cached content verlopen. Klik Vernieuwen (admin/dev).' : 'Klik Vernieuwen voor nieuws (admin/dev).')}
        </div>
      )}
    </div>
  )
}

function FinanceChatbot({
  monthSummary,
  lastEntries,
  userId,
  toast,
}: {
  monthSummary: { totalIncome: number; totalExpense: number; balance: number }
  lastEntries: FinanceEntry[]
  userId: string
  toast: (m: string, t?: 'success' | 'error' | 'info') => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = sessionStorage.getItem(CHAT_STORAGE_KEY)
      if (!raw) return []
      return JSON.parse(raw) as ChatMessage[]
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // ignore
    }
  }, [messages])

  const send = async () => {
    const q = input.trim()
    if (!q) return
    const url = process.env.NEXT_PUBLIC_N8N_FINANCE_CHAT_WEBHOOK
    if (!url) {
      toast('Chatbot nog niet gekoppeld')
      return
    }
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setInput('')
    setSending(true)
    try {
      const context = {
        month_summary: monthSummary,
        last_entries: lastEntries.slice(0, 10).map((e) => ({ type: e.type, title: e.title, amount: e.amount, entry_date: e.entry_date })),
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, question: q, context }),
      })
      const data = await res.json().catch(() => ({}))
      const answer = typeof data.reply === 'string' ? data.reply : (data.answer ?? data.text ?? 'Geen antwoord.')
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Fout bij ophalen antwoord.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-4 flex flex-col h-[320px]">
      <h2 className="text-sm font-semibold text-slate-900 mb-2">Finance chatbot</h2>
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-0">
        {messages.length === 0 && <p className="text-slate-500 text-xs">Stel een vraag over je financiën.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm rounded-lg px-3 py-2 ${m.role === 'user' ? 'bg-indigo-100 ml-4' : 'bg-slate-100 mr-4'}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Vraag..."
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
          disabled={sending}
        />
        <button type="button" onClick={send} disabled={sending || !input.trim()} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">
          Verstuur
        </button>
      </div>
    </div>
  )
}

export type BankzaldoSectionProps = {
  entries: FinanceEntry[]
  loading: boolean
  totalIncome: number
  totalExpense: number
  balance: number
  user: { id: string }
  toast: (m: string, t?: 'success' | 'error' | 'info') => void
  onSubmitNewEntry: (e: React.FormEvent) => Promise<void>
  onDeleteEntry: (entry: FinanceEntry) => Promise<void>
  form: { type: 'income' | 'expense'; title: string; amount: string; entry_date: string }
  setForm: React.Dispatch<React.SetStateAction<{ type: 'income' | 'expense'; title: string; amount: string; entry_date: string }>>
  adding: boolean
  canSee: (feature: string) => boolean
  isAdmin: boolean
}

export function BankzaldoSection({
  entries,
  loading,
  totalIncome,
  totalExpense,
  balance,
  user,
  toast,
  onSubmitNewEntry,
  onDeleteEntry,
  form,
  setForm,
  adding,
  canSee,
  isAdmin,
}: BankzaldoSectionProps) {
  const avgPerDay = 30 > 0 ? balance / 30 : 0
  const forecast7 = balance + avgPerDay * 7
  const forecast30 = balance + avgPerDay * 30
  const warnings: string[] = []
  if (balance < 0) warnings.push('Negatief maandsaldo — focus op inkomsten verhogen of uitgaven verlagen.')
  if (balance >= 0 && totalExpense > 0 && balance < totalExpense) warnings.push('Vrij besteedbaar lager dan maandelijkse uitgaven — overweeg buffer op te bouwen.')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard title="Inkomsten deze maand" value={`€ ${totalIncome.toFixed(2)}`} variant="income" />
        <SummaryCard title="Uitgaven deze maand" value={`€ ${totalExpense.toFixed(2)}`} variant="expense" />
        <SummaryCard title="Vrij besteedbaar" value={`€ ${balance.toFixed(2)}`} variant="balance" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Cashflow voorspelling</h2>
        <p className="text-xs text-slate-500 mb-2">Gebaseerd op gemiddelde dagelijkse verandering (vrij besteedbaar / 30).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded border border-slate-200 p-3">
            <p className="text-slate-500">Geschat over 7 dagen</p>
            <p className="font-semibold text-slate-900">€ {forecast7.toFixed(2)}</p>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-slate-500">Geschat over 30 dagen</p>
            <p className="font-semibold text-slate-900">€ {forecast30.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-800 mb-2">Financiële waarschuwingen</h2>
          <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <QuickActionCanPay balance={balance} toast={toast} />
        <QuickActionSpendToday balance={balance} toast={toast} />
        <QuickActionWhereMoney entries={entries} toast={toast} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Nieuwe entry</h2>
        <form onSubmit={onSubmitNewEntry} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'income' | 'expense' }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="income">Inkomst</option>
              <option value="expense">Uitgave</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Titel</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Bijv. Salaris"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bedrag</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Datum</label>
            <input
              type="date"
              value={form.entry_date}
              onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
            <button
              type="submit"
              disabled={adding}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {adding ? 'Bezig…' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Entries deze maand</h2>
            </div>
            {loading ? (
              <div className="px-6 py-8 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 rounded bg-slate-200 animate-pulse" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-500 text-sm">Geen entries deze maand.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-slate-600 font-medium">Datum</th>
                    <th className="text-left px-6 py-3 text-slate-600 font-medium">Titel</th>
                    <th className="text-left px-6 py-3 text-slate-600 font-medium">Type</th>
                    <th className="text-right px-6 py-3 text-slate-600 font-medium">Bedrag</th>
                    <th className="text-right px-6 py-3 text-slate-600 font-medium w-24">Actie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 text-slate-600">{formatDate(entry.entry_date)}</td>
                      <td className="px-6 py-3 font-medium text-slate-900">{entry.title}</td>
                      <td className="px-6 py-3">
                        <span className={entry.type === 'income' ? 'text-emerald-600' : 'text-red-600'}>
                          {entry.type === 'income' ? 'Inkomst' : 'Uitgave'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-medium">
                        {entry.type === 'income' ? '+' : '-'} € {(Number(entry.amount) || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(entry)}
                          className="text-red-600 hover:underline text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {canSee('finance_ai_news') && <FinanceAiNewsBlock isAdminOrDev={isAdmin} />}
        </div>

        {canSee('finance_chatbot') && (
          <FinanceChatbot
            monthSummary={{ totalIncome, totalExpense, balance }}
            lastEntries={entries.slice(0, 10)}
            userId={user.id}
            toast={toast}
          />
        )}
      </div>
    </div>
  )
}
