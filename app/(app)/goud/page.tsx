'use client'

import { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default function GoudPage() {
  const [accountBalance, setAccountBalance] = useState('10000')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [entry, setEntry] = useState('2650')
  const [stopLoss, setStopLoss] = useState('2640')

  const calc = useMemo(() => {
    const balance = parseFloat(accountBalance) || 0
    const entryVal = parseFloat(entry) || 0
    const slVal = parseFloat(stopLoss) || 0
    const riskAmount = balance * 0.01
    const slDistance = Math.abs(entryVal - slVal)
    const positionSize = slDistance > 0 ? riskAmount / slDistance : 0
    const tpLong = entryVal + slDistance * 2
    const tpShort = entryVal - slDistance * 2
    const tp = direction === 'long' ? tpLong : tpShort
    const rr = slDistance > 0 ? Math.abs(tp - entryVal) / slDistance : 0
    return {
      riskAmount,
      slDistance,
      positionSize,
      takeProfit: tp,
      rr,
      valid: rr >= 2,
    }
  }, [accountBalance, entry, stopLoss, direction])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-white">🥇 Goud Analyse Engine</h1>
      <p className="text-white/70 text-sm">Trading plan: XAUUSD · Min R:R 1:2 · Max 2 trades/dag</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Inputs</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">Account balance</label>
              <Input
                type="text"
                inputMode="decimal"
                value={accountBalance}
                onChange={(e) => setAccountBalance(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Richting</label>
              <div className="flex gap-2">
                <Button
                  variant={direction === 'long' ? 'primary' : 'secondary'}
                  onClick={() => setDirection('long')}
                >
                  Long
                </Button>
                <Button
                  variant={direction === 'short' ? 'primary' : 'secondary'}
                  onClick={() => setDirection('short')}
                >
                  Short
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Entry</label>
              <Input type="text" inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Stop loss</label>
              <Input type="text" inputMode="decimal" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Outputs</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2 text-sm">
            <p className="text-white/80">Risk amount: <span className="text-white font-medium">€ {calc.riskAmount.toFixed(2)}</span></p>
            <p className="text-white/80">SL distance: <span className="text-white font-medium">{calc.slDistance.toFixed(2)}</span></p>
            <p className="text-white/80">Position size: <span className="text-white font-medium">{calc.positionSize.toFixed(4)}</span></p>
            <p className="text-white/80">Take profit: <span className="text-white font-medium">{calc.takeProfit.toFixed(2)}</span></p>
            <p className="text-white/80">R:R = <span className="text-white font-medium">{calc.rr.toFixed(2)}</span></p>
            <Badge variant={calc.valid ? 'success' : 'danger'}>{calc.valid ? 'VALID' : 'INVALID'}</Badge>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Trendfilter</CardTitle>
          </CardHeader>
          <CardContent className="p-0 text-sm text-white/70">
            Trendfilter check vereist via live data integratie. 200 EMA op 4H (placeholder).
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
