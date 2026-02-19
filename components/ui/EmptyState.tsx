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
      className={`flex flex-col items-center justify-center rounded-2xl border border-[#e5e7eb] bg-white py-12 px-6 text-center ${className}`}
    >
      <div className="rounded-full bg-slate-100 p-4 text-slate-400">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-slate-900">{title}</h3>
      {description != null && <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>}
      {action != null && <div className="mt-4">{action}</div>}
    </div>
  )
}
