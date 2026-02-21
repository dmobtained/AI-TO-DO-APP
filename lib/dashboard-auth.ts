import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  buildFeatureFlags,
  defaultFeatureFlags,
  type FeatureFlags,
  type RawModuleRow,
} from '@/lib/feature-flags'

export type ModuleStatus = Record<string, boolean>

export type DashboardAuthResult = {
  session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null
  role: 'admin' | 'user'
  flags: FeatureFlags
  profileEmail: string | null
  profileName: string | null
  moduleStatus: ModuleStatus
}

/**
 * Server-only: get session, role (metadata + profiles fallback), and feature flags for dashboard layout.
 * One query for session, one for profile, one for modules (when admin client available).
 */
export async function getDashboardAuth(): Promise<DashboardAuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      session: null,
      role: 'user',
      flags: defaultFeatureFlags(),
      profileEmail: null,
      profileName: null,
      moduleStatus: {},
    }
  }

  const metaRole = user.user_metadata?.role
  const roleFromMeta = typeof metaRole === 'string' && metaRole.toLowerCase().trim() === 'admin' ? 'admin' : 'user'

  let role: 'admin' | 'user' = roleFromMeta
  let profileEmail: string | null = user.email ?? null
  let profileName: string | null = (user.user_metadata?.full_name as string) ?? (user.user_metadata?.name as string) ?? null

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email, full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      if (roleFromMeta !== 'admin') role = (profile.role?.toLowerCase?.() ?? '') === 'admin' ? 'admin' : 'user'
      if (profile.email != null) profileEmail = profile.email
      if (profile.full_name != null && String(profile.full_name).trim()) profileName = String(profile.full_name).trim()
    }
  } catch {
    // profiles table missing or RLS: keep role from metadata
  }

  let flags = defaultFeatureFlags()
  const moduleStatus: ModuleStatus = {}
  const client = supabaseAdmin ?? supabase
  try {
    const { data: rows } = await client
      .from('modules')
      .select('id, name, is_active, position, developer_mode')
    const raw = (rows ?? []) as RawModuleRow[]
    flags = buildFeatureFlags(raw)
    const nameToFeatureKey: Record<string, import('@/lib/feature-flags').FeatureKey> = {
      taken: 'dashboard_tasks_list',
      financien: 'finance_module',
      email: 'email_module',
    }
    raw.forEach((r) => {
      if (r.name != null) {
        moduleStatus[r.name] = r.is_active === true
        const fk = nameToFeatureKey[r.name]
        if (fk) flags[fk] = r.is_active === true
      }
    })
    if (Object.keys(moduleStatus).length === 0) {
      ['dashboard', 'taken', 'financien', 'email', 'instellingen', 'admin'].forEach((name) => {
        moduleStatus[name] = true
      })
    }
  } catch {
    ['dashboard', 'taken', 'financien', 'email', 'instellingen', 'admin'].forEach((name) => {
      moduleStatus[name] = true
    })
  }

  return {
    session: { user: { id: user.id, email: user.email ?? undefined, user_metadata: user.user_metadata } },
    role,
    flags,
    profileEmail,
    profileName,
    moduleStatus,
  }
}
