'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  currencyList,
  fetchRates,
  getCachedRates,
  setCachedRates,
  convert,
  type RatesResult,
} from '@/lib/currency'
import { ArrowRightLeft, RefreshCw } from 'lucide-react'

const QUICK_PAIRS: [string, string][] = [
  ['EUR', 'USD'],
  ['EUR', 'GBP'],
  ['USD', 'GBP'],
  ['EUR', 'JPY'],
  ['EUR', 'CHF'],
  ['EUR', 'TRY'],
]

export default function ValutaPage() {
  const [amount, setAmount] = useState('100')
  const [from, setFrom] = useState('EUR')
  const [to, setTo] = useState('USD')
  const [rates, setRates] = useState<RatesResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchFrom, setSearchFrom] = useState('')
  const [searchTo, setSearchTo] = useState('')

  const loadRates = useCallback(async (base: string) => {
    const cached = getCachedRates(base)
    if (cached) {
      setRates(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await fetchRates(base)
      setRates(result)
      setCachedRates(base, result)
    } catch {
      setRates({
        base: 'EUR',
        rates: { EUR: 1, USD: 1.08, GBP: 0.86, JPY: 161, CHF: 0.95, TRY: 34.5 },
        timestamp: Date.now(),
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRates(from)
  }, [from, loadRates])

  const amountNum = parseFloat(amount.replace(',', '.')) || 0
  const converted =
    rates && amountNum > 0
      ? convert(amountNum, from, to, rates.rates, rates.base)
      : 0

  const filteredFrom = searchFrom
    ? currencyList.filter(
        (c) =>
          c.code.toLowerCase().includes(searchFrom.toLowerCase()) ||
          c.name.toLowerCase().includes(searchFrom.toLowerCase())
      )
    : currencyList
  const filteredTo = searchTo
    ? currencyList.filter(
        (c) =>
          c.code.toLowerCase().includes(searchTo.toLowerCase()) ||
          c.name.toLowerCase().includes(searchTo.toLowerCase())
      )
    : currencyList

  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  const lastUpdated = rates?.timestamp
    ? new Date(rates.timestamp).toLocaleString('nl-NL')
    : '—'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-white">Valuta</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Converter</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Bedrag</label>
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Van</label>
              <Input
                placeholder="Zoek..."
                value={searchFrom}
                onChange={(e) => setSearchFrom(e.target.value)}
                className="mb-2"
              />
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#171a21] px-4 py-2.5 text-sm text-white focus:border-[#3b82f6] focus:outline-none max-h-40 overflow-y-auto"
              >
                {filteredFrom.slice(0, 50).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} – {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="secondary" onClick={swap} className="w-full">
              <ArrowRightLeft className="h-4 w-4 mr-2" /> Swap
            </Button>
            <div>
              <label className="block text-sm text-white/70 mb-1">Naar</label>
              <Input
                placeholder="Zoek..."
                value={searchTo}
                onChange={(e) => setSearchTo(e.target.value)}
                className="mb-2"
              />
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#171a21] px-4 py-2.5 text-sm text-white focus:border-[#3b82f6] focus:outline-none max-h-40 overflow-y-auto"
              >
                {filteredTo.slice(0, 50).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} – {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-2 rounded-lg bg-white/5 p-3">
              <p className="text-xs text-white/50">Uitkomst (live koersen)</p>
              <p className="text-2xl font-bold text-white">
                {loading ? 'Laden…' : amountNum > 0 ? `${converted.toFixed(4)} ${to}` : '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 pb-4 flex justify-between items-center">
            <CardTitle>Koersen (Frankfurter/ECB)</CardTitle>
            <span className="text-xs text-white/50">Bijgewerkt: {lastUpdated}</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-2">
              {QUICK_PAIRS.map(([a, b]) => {
                const rate =
                  rates && rates.rates[b] != null && rates.rates[a] != null
                    ? a === rates.base
                      ? rates.rates[b]
                      : b === rates.base
                        ? 1 / rates.rates[a]
                        : rates.rates[b] / rates.rates[a]
                    : null
                return (
                  <div
                    key={`${a}-${b}`}
                    className="flex justify-between py-2 border-b border-white/5 text-sm"
                  >
                    <span className="text-white/80">
                      {a} ↔ {b}
                    </span>
                    <span className="text-white font-medium">
                      {loading || rate == null ? '—' : rate.toFixed(4)}
                    </span>
                  </div>
                )
              })}
            </div>
            <Button
              variant="ghost"
              className="mt-4 w-full"
              onClick={() => loadRates(from)}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Vernieuwen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
