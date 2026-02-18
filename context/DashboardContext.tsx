'use client'

import { createContext, useContext, useMemo } from 'react'
import { canSeeFeature, type FeatureFlags, type FeatureKey } from '@/lib/feature-flags'

type DashboardContextValue = {
  flags: FeatureFlags
  role: 'admin' | 'user'
  isAdmin: boolean
  canSee: (key: FeatureKey) => boolean
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({
  flags,
  role,
  children,
}: {
  flags: FeatureFlags
  role: 'admin' | 'user'
  children: React.ReactNode
}) {
  const value = useMemo(
    () => ({
      flags,
      role,
      isAdmin: role === 'admin',
      canSee: (key: FeatureKey) => canSeeFeature(flags, key, role === 'admin'),
    }),
    [flags, role]
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
