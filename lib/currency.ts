/**
 * Currency list and exchange rate helpers. TTL 60 min cache in localStorage.
 */

export type CurrencyItem = { code: string; name: string }

export const currencyList: CurrencyItem[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'EUR', name: 'Euro' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'ILS', name: 'Israeli Shekel' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'HRK', name: 'Croatian Kuna' },
  { code: 'ISK', name: 'Icelandic Krona' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'ARS', name: 'Argentine Peso' },
  { code: 'CLP', name: 'Chilean Peso' },
]

const CACHE_KEY = 'currency_rates_'
const TTL_MS = 60 * 60 * 1000

export type RatesResult = { rates: Record<string, number>; timestamp: number; base: string }

export function getCachedRates(base: string): RatesResult | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY + base)
    if (!raw) return null
    const data = JSON.parse(raw) as RatesResult
    if (Date.now() - data.timestamp > TTL_MS) return null
    return data
  } catch {
    return null
  }
}

export function setCachedRates(base: string, data: RatesResult): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY + base, JSON.stringify(data))
  } catch {
    // ignore
  }
}

const FALLBACK_RATES: Record<string, Record<string, number>> = {
  EUR: {
    USD: 1.08, GBP: 0.86, JPY: 161, CHF: 0.95, CAD: 1.46, AUD: 1.65, NZD: 1.78, SEK: 11.2, NOK: 11.5, DKK: 7.46,
    PLN: 4.31, CZK: 25.1, HUF: 395, TRY: 34.5, ZAR: 20.2, MXN: 18.4, BRL: 5.42, INR: 89.8, IDR: 16900, SGD: 1.45,
    HKD: 8.45, CNY: 7.78, KRW: 1440, THB: 38.5, MYR: 5.12, AED: 3.97, SAR: 4.05, QAR: 3.94, KWD: 0.33, EGP: 33.3,
    ILS: 4.02, RON: 4.97, BGN: 1.96, HRK: 7.53, ISK: 149, PHP: 60.5, VND: 26600, ARS: 935, CLP: 1050, EUR: 1,
  },
}

export async function fetchRates(base: string): Promise<RatesResult> {
  const cached = getCachedRates(base)
  if (cached) return cached
  try {
    const res = await fetch(
      `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`
    )
    const data = await res.json()
    if (data?.rates && typeof data.rates === 'object') {
      const result: RatesResult = {
        base: data.base ?? base,
        rates: data.rates as Record<string, number>,
        timestamp: Date.now(),
      }
      setCachedRates(base, result)
      return result
    }
  } catch {
    // fallback
  }
  const fallback = FALLBACK_RATES[base] ?? FALLBACK_RATES.EUR
  return { base, rates: { ...fallback, [base]: 1 }, timestamp: Date.now() }
}

export function convert(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
  base: string
): number {
  if (from === to) return amount
  const fromRate = from === base ? 1 : rates[from]
  const toRate = to === base ? 1 : rates[to]
  if (fromRate == null || toRate == null) return 0
  return (amount / fromRate) * toRate
}
