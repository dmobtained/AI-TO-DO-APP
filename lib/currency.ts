/**
 * Currency list (40+ codes) and exchange rate helpers.
 * Live rates via API with fallback to mock data.
 */

export type CurrencyCode = string

export type CurrencyItem = { code: string; name: string }

export const currencyList: CurrencyItem[] = [
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'GBP', name: 'British Pound' },
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
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'COP', name: 'Colombian Peso' },
  { code: 'PEN', name: 'Peruvian Sol' },
]

export type RatesMap = Record<string, number>

const MOCK_RATES: RatesMap = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
  JPY: 161,
  CHF: 0.95,
  CAD: 1.47,
  AUD: 1.65,
  NZD: 1.78,
  SEK: 11.2,
  NOK: 11.6,
  DKK: 7.46,
  PLN: 4.31,
  CZK: 25.1,
  HUF: 395,
  TRY: 34.5,
  ZAR: 20.2,
  MXN: 18.5,
  BRL: 5.38,
  INR: 89.5,
  IDR: 16900,
  SGD: 1.45,
  HKD: 8.45,
  CNY: 7.82,
  KRW: 1440,
  THB: 38.2,
  MYR: 5.12,
  AED: 3.97,
  SAR: 4.05,
  QAR: 3.94,
  KWD: 0.33,
  EGP: 33.2,
  ILS: 4.0,
  RON: 4.97,
  BGN: 1.96,
  HRK: 7.53,
  ISK: 149,
  PHP: 60.5,
  VND: 26600,
  ARS: 925,
  CLP: 985,
  RUB: 99.5,
  COP: 4250,
  PEN: 4.08,
}

const CACHE_KEY = 'currency_rates_cache'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 min

type CacheEntry = { rates: RatesMap; base: string; at: number }

function getCachedRates(base: string): RatesMap | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (entry.base !== base || Date.now() - entry.at > CACHE_TTL_MS) return null
    return entry.rates
  } catch {
    return null
  }
}

function setCachedRates(base: string, rates: RatesMap): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ base, rates, at: Date.now() }))
  } catch {
    // ignore
  }
}

/**
 * Fetch live rates for base currency. Returns mock if API fails.
 */
export async function fetchRates(base: string): Promise<{ rates: RatesMap; updatedAt: number }> {
  const cached = getCachedRates(base)
  if (cached) return { rates: cached, updatedAt: Date.now() }

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${currencyList.map((c) => c.code).filter((c) => c !== base).join(',')}`
    )
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    const rates: RatesMap = { [base]: 1 }
    if (data.rates && typeof data.rates === 'object') {
      Object.assign(rates, data.rates)
    }
    setCachedRates(base, rates)
    return { rates, updatedAt: Date.now() }
  } catch {
    const rates: RatesMap = {}
    currencyList.forEach((c) => {
      if (MOCK_RATES[c.code] != null && MOCK_RATES[base] != null)
        rates[c.code] = MOCK_RATES[c.code] / MOCK_RATES[base]
      else if (c.code === base) rates[c.code] = 1
      else rates[c.code] = MOCK_RATES[c.code] ?? 1
    })
    if (!rates[base]) rates[base] = 1
    return { rates, updatedAt: Date.now() }
  }
}

/**
 * Convert amount from one currency to another using rates map.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: RatesMap
): number {
  if (from === to) return amount
  const fromRate = rates[from] ?? 1
  const toRate = rates[to] ?? 1
  if (toRate === 0) return amount
  return (amount * toRate) / fromRate
}
