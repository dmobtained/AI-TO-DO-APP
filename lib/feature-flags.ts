/**
 * Feature flag keys used in the app. Stored in public.modules (name or slug = key, enabled = is_active/enabled/status).
 */
export const FEATURE_KEYS = [
  'dashboard_tasks_list',
  'finance_module',
  'finance_ai_news',
  'finance_chatbot',
  'email_module',
  'decision_log',
  'cashflow_forecast',
  'financial_warnings',
  'productivity_meter',
  'focus_today',
] as const

export type FeatureKey = (typeof FEATURE_KEYS)[number]

export type FeatureFlags = Record<FeatureKey, boolean>

/** Default: all off for non-admin if not in DB */
export function defaultFeatureFlags(): FeatureFlags {
  return FEATURE_KEYS.reduce((acc, k) => ({ ...acc, [k]: false }), {} as FeatureFlags)
}

export type RawModuleRow = {
  id: string
  name?: string
  slug?: string
  is_active?: boolean
  enabled?: boolean
  status?: string
  order_index?: number
  position?: number
}

/**
 * Build feature flags map from modules rows.
 * Module is "enabled" if: is_active === true, or enabled === true, or status === 'live'.
 * Key is matched by name or slug (case-insensitive) to FEATURE_KEYS.
 */
export function buildFeatureFlags(rows: RawModuleRow[]): FeatureFlags {
  const flags = defaultFeatureFlags()
  const keyStr = (v: string | undefined) => (v ?? '').toLowerCase().trim().replace(/-/g, '_')
  for (const row of rows) {
    const nameKey = keyStr(row.name)
    const slugKey = keyStr(row.slug)
    const enabled =
      row.enabled === true ||
      row.is_active === true ||
      (typeof row.status === 'string' && row.status.toLowerCase() === 'live')
    for (const k of FEATURE_KEYS) {
      if (nameKey === k || slugKey === k) {
        flags[k] = enabled
        break
      }
    }
  }
  return flags
}

/** Core modules: always visible for all users (admin and user). */
const CORE_FEATURE_KEYS: FeatureKey[] = ['dashboard_tasks_list', 'email_module', 'finance_module']

/**
 * For admin: can see all features. For user: core modules always, others only if flag is true.
 */
export function canSeeFeature(flags: FeatureFlags, key: FeatureKey, isAdmin: boolean): boolean {
  if (isAdmin) return true
  if (CORE_FEATURE_KEYS.includes(key)) return true
  return flags[key] === true
}
