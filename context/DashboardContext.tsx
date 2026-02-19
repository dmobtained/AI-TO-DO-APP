'use client'

import { createContext, useContext, useMemo } from 'react'
import { canSeeFeature, type FeatureFlags, type FeatureKey } from '@/lib/feature-flags'

type DashboardContextValue = {
  flags: FeatureFlags
  role: 'admin' | 'user'
  isAdmin: boolean
  /** Display name for greeting (profile name, email, or null). */
  profileName: string | null
  canSee: (key: FeatureKey) => boolean
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({
  flags,
  role,
  profileName: displayName,
  children,
}: {
  flags: FeatureFlags
  role: 'admin' | 'user'
  /** Display name for "Welkom terug {name}" (passed from shell). */
  profileName?: string | null
  children: React.ReactNode
}) {
  const value = useMemo(
    () => ({
      flags,
      role,
      isAdmin: role === 'admin',
      profileName: displayName ?? null,
      canSee: (key: FeatureKey) => canSeeFeature(flags, key, role === 'admin'),
    }),
    [flags, role, displayName]
  )
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}

export function useDashboardOptional(): DashboardContextValue | null {
  return useContext(DashboardContext)
}
