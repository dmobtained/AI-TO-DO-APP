'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { currencyList, fetchRates, convert, type RatesMap, type RatesSource } from '@/lib/currency'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageContainer } from '@/components/ui/PageContainer'
import { ArrowRightLeft, RefreshCw } from 'lucide-react'

const selectClass =
  'w-full rounded-[10px] border border-border bg-card px-4 py-2.5 text-sm text-textPrimary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 max-h-40 overflow-y-auto'

export default function ValutaPage() {
  const [amount, setAmount] = useState('100')
  const [from, setFrom] = useState('EUR')
  const [to, setTo] = useState('USD')
  const [rates, setRates] = useState<RatesMap | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number>(0)
  const [ratesSource, setRatesSource] = useState<RatesSource>('api')
  const [loading, setLoading] = useState(true)
  const [searchFrom, setSearchFrom] = useState('')
  const [searchTo, setSearchTo] = useState('')

  const loadRates = useCallback(async (base: string) => {
    setLoading(true)
    try {
      const result = await fetchRates(base)
      setRates(result.rates)
      setUpdatedAt(result.updatedAt)
      setRatesSource(result.source)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRates(from)
  }, [from, loadRates])

  const amountNum = parseFloat(amount.replace(',', '.').replace(/\s/g, '')) || 0
  const converted = rates ? convert(amountNum, from, to, rates) : 0

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

  const lastUpdated = updatedAt ? new Date(updatedAt).toLocaleString('nl-NL') : '—'

  return (
    <PageContainer className="max-w-4xl space-y-6">
      <SectionHeader title="Valuta" subtitle="Omrekenen op basis van actuele koersen (Frankfurter/ECB)." />
      {ratesSource === 'mock' && (
        <div className="rounded-[10px] border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          Offline of API niet bereikbaar. Je ziet geschatte/cache-koersen; vernieuw later voor actuele koersen.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Converter</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Bedrag</label>
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Van</label>
              <Input
                placeholder="Zoek valuta..."
                value={searchFrom}
                onChange={(e) => setSearchFrom(e.target.value)}
                className="mb-2"
              />
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={selectClass}
              >
                {filteredFrom.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} – {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="secondary" onClick={swap} className="w-full">
              <ArrowRightLeft className="h-4 w-4 mr-2" /> Wissel
            </Button>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Naar</label>
              <Input
                placeholder="Zoek valuta..."
                value={searchTo}
                onChange={(e) => setSearchTo(e.target.value)}
                className="mb-2"
              />
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={selectClass}
              >
                {filteredTo.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} – {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-3 rounded-[10px] bg-primarySoft border border-primary/20 p-4">
              <p className="text-xs text-textSecondary mb-1">Uitkomst</p>
              <p className="text-2xl font-bold text-textPrimary">
                {loading ? 'Laden…' : `${converted.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${to}`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6 flex flex-col">
          <CardHeader className="p-0 pb-4 flex justify-between items-center shrink-0">
            <CardTitle>Alle koersen (1 {from} = …)</CardTitle>
            <span className="text-xs text-textSecondary whitespace-nowrap ml-2">Bijgewerkt: {lastUpdated}</span>
          </CardHeader>
          <CardContent className="p-0 flex flex-col min-h-0">
            <div className="space-y-1 overflow-y-auto max-h-[320px] pr-1 border border-border rounded-[10px] bg-card/50 p-2">
              {currencyList.filter((c) => c.code !== from).map((c) => {
                const rate =
                  rates && rates[c.code] != null && rates[from] != null
                    ? (rates[c.code] ?? 0) / (rates[from] ?? 1)
                    : null
                return (
                  <div
                    key={c.code}
                    className="flex justify-between items-center gap-2 py-2 px-2 rounded-[8px] hover:bg-hover text-sm"
                  >
                    <span className="text-textPrimary font-medium shrink-0">
                      {c.code} – {c.name}
                    </span>
                    <span className="text-textSecondary tabular-nums text-right">
                      {loading || rate == null ? '—' : `1 ${from} = ${rate.toLocaleString('nl-NL', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} ${c.code}`}
                    </span>
                  </div>
                )
              })}
            </div>
            <Button
              variant="ghost"
              className="mt-4 w-full shrink-0"
              onClick={() => loadRates(from)}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Vernieuwen
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
