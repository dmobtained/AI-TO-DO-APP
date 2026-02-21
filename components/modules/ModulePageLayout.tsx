'use client'

import { PageContainer } from '@/components/ui/PageContainer'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { LockedBanner } from './LockedBanner'
import { ModuleStatCards, type StatCardConfig } from './ModuleStatCards'

type ModulePageLayoutProps = {
  title: string
  subtitle?: string
  primaryAction?: React.ReactNode
  locked?: boolean
  lockedLabel?: string
  /** When set and locked, show "Under maintenance: {lockedReason}" in the banner. */
  lockedReason?: string | null
  statCards?: StatCardConfig[]
  children: React.ReactNode
  className?: string
}

export function ModulePageLayout({
  title,
  subtitle,
  primaryAction,
  locked = false,
  lockedLabel,
  lockedReason,
  statCards,
  children,
  className = '',
}: ModulePageLayoutProps) {
  return (
    <PageContainer className={className}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={primaryAction}
      />
      {locked && (
        <LockedBanner
          moduleLabel={lockedLabel ?? title}
          reason={lockedReason}
          className="mt-4"
        />
      )}
      {statCards != null && statCards.length > 0 && (
        <ModuleStatCards cards={statCards} className="mt-6" />
      )}
      <div className={statCards != null && statCards.length > 0 ? 'mt-8' : 'mt-6'}>
        {children}
      </div>
    </PageContainer>
  )
}
