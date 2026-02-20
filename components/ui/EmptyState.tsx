'use client'

import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[14px] border border-border bg-card py-12 px-6 text-center ${className}`}
    >
      <div className="rounded-full bg-hover p-4 text-textSecondary">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-textPrimary">{title}</h3>
      {description != null && <p className="mt-1 text-sm text-textSecondary max-w-sm">{description}</p>}
      {action != null && <div className="mt-4">{action}</div>}
    </div>
  )
}
