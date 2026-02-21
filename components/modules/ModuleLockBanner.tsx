'use client'

import { useModuleLock } from '@/hooks/useModuleLock'
import { LockedBanner } from './LockedBanner'

type ModuleLockBannerProps = {
  moduleKey: string
  moduleLabel?: string
  className?: string
}

/**
 * Fetches lock state for the module and shows a banner when locked.
 * Use on module pages (taken, notities, auto, etc.) so users see "Under maintenance: &lt;reason&gt;".
 * Server guard remains authoritative for writes.
 */
export function ModuleLockBanner({
  moduleKey,
  moduleLabel,
  className = '',
}: ModuleLockBannerProps) {
  const { locked, reason, loading } = useModuleLock(moduleKey)
  if (loading || !locked) return null
  return (
    <LockedBanner
      moduleLabel={moduleLabel}
      reason={reason}
      className={className}
    />
  )
}
