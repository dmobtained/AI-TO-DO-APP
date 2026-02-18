'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { FeatureKey } from '@/lib/feature-flags'
import { useDashboardOptional } from '@/context/DashboardContext'
import { useToast } from '@/context/ToastContext'

/**
 * Redirects to /dashboard with toast when feature is disabled (non-admin only).
 * Use at top of a page that requires a feature flag.
 */
export function FeatureGuard({
  feature,
  children,
}: {
  feature: FeatureKey
  children: React.ReactNode
}) {
  const router = useRouter()
  const toast = useToast()
  const dashboard = useDashboardOptional()

  useEffect(() => {
    if (!dashboard) return
    if (dashboard.canSee(feature)) return
    toast('Deze module is tijdelijk uitgeschakeld', 'info')
    router.replace('/dashboard')
  }, [dashboard, feature, router, toast])

  if (!dashboard) return <>{children}</>
  if (!dashboard.canSee(feature)) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="mt-4 h-4 w-64 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
    )
  }
  return <>{children}</>
}
