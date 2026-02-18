export type FinanceEntry = {
  id: string
  user_id: string
  type: 'income' | 'expense'
  title: string
  amount: string
  entry_date: string
  created_at: string
}

export function getMonthRange() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { first, last }
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function parseNonNegativeNumber(value: string): number {
  const n = parseFloat(value.replace(',', '.'))
  if (Number.isNaN(n) || n < 0) return 0
  return n
}

export function parsePercentage(value: string): number {
  const n = parseFloat(value.replace(',', '.'))
  if (Number.isNaN(n) || n < 0 || n > 100) return 0
  return n / 100
}

export const SAVINGS_PREFIX = '[SAVINGS]'
export const SAVINGS_WITHDRAW_PREFIX = '[SAVINGS_WITHDRAW]'
export const SAVINGS_RATE_KEY = 'savings_rate_'

export function savingsBalance(entries: FinanceEntry[]): number {
  let deposits = 0
  let withdrawals = 0
  for (const e of entries) {
    const amount = Number(e.amount) || 0
    if ((e.title || '').startsWith(SAVINGS_PREFIX)) deposits += amount
    else if ((e.title || '').startsWith(SAVINGS_WITHDRAW_PREFIX)) withdrawals += amount
  }
  return deposits - withdrawals
}
