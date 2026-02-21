import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const type = body?.type

    if (type === 'debt_analysis') {
      const debts = Array.isArray(body.debts) ? body.debts : []
      const income = Number(body.income) || 0
      const fixedExpenses = Number(body.fixed_expenses) || 0
      const variableExpenses = Number(body.variable_expenses) || 0
      const freeCashflow = income - fixedExpenses - variableExpenses - debts.reduce((s: number, d: { monthly_payment?: number }) => s + (Number(d.monthly_payment) || 0), 0)

      // Prioriteit: hoogste rente eerst (avalanche)
      const sorted = [...debts].sort((a, b) => (Number(b.interest_rate) || 0) - (Number(a.interest_rate) || 0))
      const priorityDebt = sorted[0]?.name ?? '—'

      // Mock AI-antwoord (later te vervangen door echte LLM-call)
      const actions: string[] = []
      if (freeCashflow < 0) {
        actions.push('Je cashflow is negatief. Focus eerst op inkomsten verhogen of vaste lasten verlagen.')
      } else {
        if (priorityDebt !== '—') actions.push(`Eerst extra aflossen op hoogste rente: ${priorityDebt}.`)
        if (freeCashflow > 50) actions.push(`Zet €${Math.min(100, Math.floor(freeCashflow / 50) * 50)} extra per maand in op aflossing.`)
      }
      if (actions.length === 0) actions.push('Houd huidig tempo aan of voer inkomsten/uitgaven in voor advies.')

      return NextResponse.json({
        actions,
        extraPerMonth: freeCashflow > 0 ? Math.min(100, Math.floor(freeCashflow / 50) * 50) : 0,
        priorityDebt,
        newEndDate: null,
        riskAnalysis: freeCashflow < 0
          ? 'Negatieve cashflow. Extra aflossen wordt afgeraden tot cashflow positief is.'
          : 'Cashflow is positief; er is ruimte voor gerichte extra aflossing.',
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
