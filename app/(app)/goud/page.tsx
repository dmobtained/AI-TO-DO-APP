"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Lock } from "lucide-react";

export default function GoudPage() {
  const [accountBalance, setAccountBalance] = useState("10000");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [entry, setEntry] = useState("2650");
  const [stopLoss, setStopLoss] = useState("2640");

  const calc = useMemo(() => {
    const balance = parseFloat(accountBalance) || 0;
    const entryVal = parseFloat(entry) || 0;
    const slVal = parseFloat(stopLoss) || 0;
    const riskAmount = balance * 0.01;
    const slDistance = Math.abs(entryVal - slVal);
    const positionSize = slDistance > 0 ? riskAmount / slDistance : 0;
    const tpLong = entryVal + slDistance * 2;
    const tpShort = entryVal - slDistance * 2;
    const tp = direction === "long" ? tpLong : tpShort;
    const rr = slDistance > 0 ? Math.abs(tp - entryVal) / slDistance : 0;
    return {
      riskAmount,
      slDistance,
      positionSize,
      takeProfit: tp,
      rr,
      valid: rr >= 2,
    };
  }, [accountBalance, entry, stopLoss, direction]);

  return (
    <PageContainer>
      <SectionHeader
        title="Goud Analyse Engine"
        subtitle="Trading plan: XAUUSD · Min R:R 1:2 · Max 2 trades/dag"
      />
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <Lock className="h-4 w-4 shrink-0" />
        <span>Risk per trade: 1%</span>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-slate-900">Inputs</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <div>
              <label className="block text-sm text-slate-500 mb-1">
                Account balance
              </label>
              <Input
                type="text"
                inputMode="decimal"
                value={accountBalance}
                onChange={(e) => setAccountBalance(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">
                Richting
              </label>
              <div className="flex gap-2">
                <Button
                  variant={direction === "long" ? "primary" : "secondary"}
                  onClick={() => setDirection("long")}
                >
                  Long
                </Button>
                <Button
                  variant={direction === "short" ? "primary" : "secondary"}
                  onClick={() => setDirection("short")}
                >
                  Short
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Entry</label>
              <Input
                type="text"
                inputMode="decimal"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">
                Stop loss
              </label>
              <Input
                type="text"
                inputMode="decimal"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-slate-900">Outputs</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2 text-sm">
            <p className="text-slate-600">
              Risk amount:{" "}
              <span className="text-slate-900 font-medium">
                € {calc.riskAmount.toFixed(2)}
              </span>
            </p>
            <p className="text-slate-600">
              SL distance:{" "}
              <span className="text-slate-900 font-medium">
                {calc.slDistance.toFixed(2)}
              </span>
            </p>
            <p className="text-slate-600">
              Position size:{" "}
              <span className="text-slate-900 font-medium">
                {calc.positionSize.toFixed(4)}
              </span>
            </p>
            <p className="text-slate-600">
              Take profit:{" "}
              <span className="text-slate-900 font-medium">
                {calc.takeProfit.toFixed(2)}
              </span>
            </p>
            <p className="text-slate-600">
              R:R ={" "}
              <span className="text-slate-900 font-medium">
                {calc.rr.toFixed(2)}
              </span>
            </p>
            <Badge variant={calc.valid ? "success" : "danger"}>
              {calc.valid ? "VALID" : "INVALID"}
            </Badge>
          </CardContent>
          <p className="mt-4 pt-4 border-t border-[#e5e7eb] text-xs text-slate-500">
            Outputs worden live herberekend. Minimaal 1:2 risk:reward = VALID.
          </p>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-slate-900">Trendfilter</CardTitle>
          </CardHeader>
          <CardContent className="p-0 text-sm text-slate-600">
            Trendfilter check vereist via live data integratie. 200 EMA op 4H
            (placeholder).
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
