'use client'

import { useState } from 'react'
import { parseNonNegativeNumber, parsePercentage } from './types'

type OndernemersResults = {
  nettoWinst: number
  btwAfTeDragen: number
  inkomstenbelasting: number
  nettoWinstNaBelasting: number
  totaalVrijBesteedbaar: number
}

function getNextBtwDeadline(): { label: string; date: Date } {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  if (month <= 2) return { label: 'Q1', date: new Date(year, 3, 30) }
  if (month <= 5) return { label: 'Q2', date: new Date(year, 6, 31) }
  if (month <= 8) return { label: 'Q3', date: new Date(year, 9, 31) }
  return { label: 'Q4', date: new Date(year + 1, 0, 31) }
}

function getIbDeadline(): Date {
  const now = new Date()
  return new Date(now.getFullYear() + 1, 4, 1)
}

export type BelastingSectionProps = {
  totalIncome: number
  totalExpense: number
  balance: number
}

export function BelastingSection({ totalIncome, totalExpense, balance }: BelastingSectionProps) {
  const [brutoOmzet, setBrutoOmzet] = useState('')
  const [zakelijkeKosten, setZakelijkeKosten] = useState('')
  const [btwPct, setBtwPct] = useState('21')
  const [ibPct, setIbPct] = useState('37')
  const [results, setResults] = useState<OndernemersResults | null>(null)

  const handleBerekenen = () => {
    const omzet = parseNonNegativeNumber(brutoOmzet)
    const kosten = parseNonNegativeNumber(zakelijkeKosten)
    const btw = parsePercentage(btwPct)
    const ib = parsePercentage(ibPct)

    const nettoWinst = Math.max(0, omzet - kosten)
    const btwOpOmzet = omzet * btw
    const btwOpKosten = kosten * btw
    const btwAfTeDragen = Math.max(0, btwOpOmzet - btwOpKosten)
    const inkomstenbelasting = nettoWinst * ib
    const nettoWinstNaBelasting = Math.max(0, nettoWinst - inkomstenbelasting)
    const totaalVrijBesteedbaar = balance + nettoWinstNaBelasting

    setResults({
      nettoWinst,
      btwAfTeDragen,
      inkomstenbelasting,
      nettoWinstNaBelasting,
      totaalVrijBesteedbaar,
    })
  }

  const handleNumberChange = (setter: (v: string) => void, value: string) => {
    if (value === '' || /^\d*[,.]?\d*$/.test(value)) setter(value)
  }

  const handlePctChange = (setter: (v: string) => void, value: string) => {
    if (value === '' || /^\d*[,.]?\d*$/.test(value)) setter(value)
  }

  const btwDeadline = getNextBtwDeadline()
  const ibDeadline = getIbDeadline()

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Belasting betalen</h2>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">Input</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bruto omzet (€)</label>
            <input
              type="text"
              inputMode="decimal"
              value={brutoOmzet}
              onChange={(e) => handleNumberChange(setBrutoOmzet, e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Zakelijke kosten (€)</label>
            <input
              type="text"
              inputMode="decimal"
              value={zakelijkeKosten}
              onChange={(e) => handleNumberChange(setZakelijkeKosten, e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">BTW %</label>
            <input
              type="text"
              inputMode="decimal"
              value={btwPct}
              onChange={(e) => handlePctChange(setBtwPct, e.target.value)}
              placeholder="21"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">IB %</label>
            <input
              type="text"
              inputMode="decimal"
              value={ibPct}
              onChange={(e) => handlePctChange(setIbPct, e.target.value)}
              placeholder="37"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleBerekenen}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Berekenen
        </button>
      </div>

      {results !== null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-lg border border-slate-200 bg-emerald-50 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Netto winst</p>
            <p className="text-xl font-semibold text-emerald-700 mt-1">€ {results.nettoWinst.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-amber-50 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">BTW af te dragen</p>
            <p className="text-xl font-semibold text-amber-700 mt-1">€ {results.btwAfTeDragen.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-red-50 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">IB te betalen</p>
            <p className="text-xl font-semibold text-red-700 mt-1">€ {results.inkomstenbelasting.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-emerald-50 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Netto over</p>
            <p className="text-xl font-semibold text-emerald-700 mt-1">€ {results.nettoWinstNaBelasting.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vrij besteedbaar na belasting</p>
            <p className="text-xl font-semibold text-slate-700 mt-1">€ {results.totaalVrijBesteedbaar.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">Belastingdeadlines</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Huidig kwartaal BTW ({btwDeadline.label})</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              Laatste dag maand na kwartaal: {btwDeadline.date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">IB deadline</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              1 mei volgend jaar: {ibDeadline.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
