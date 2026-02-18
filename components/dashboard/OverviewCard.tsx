'use client'

import type { ReactNode } from 'react'

type OverviewCardProps = {
  title: string
  value: string | number
  icon: ReactNode
  accent?: 'orange' | 'teal' | 'red' | 'muted'
  delay?: number
}

const accentStyles = {
  orange: 'bg-datadenkt-orange/15 text-datadenkt-orange border-datadenkt-orange/25',
  teal: 'bg-datadenkt-teal/15 text-datadenkt-teal border-datadenkt-teal/25',
  red: 'bg-red-500/15 text-red-400 border-red-500/25',
  muted: 'bg-datadenkt-white/10 text-datadenkt-white/70 border-datadenkt-white/15',
}

const valueAccentStyles = {
  orange: 'text-datadenkt-orange',
  teal: 'text-datadenkt-teal',
  red: 'text-red-400',
  muted: 'text-datadenkt-white',
}

export function OverviewCard({ title, value, icon, accent = 'muted', delay = 0 }: OverviewCardProps) {
  return (
    <div
      className="card-primary p-6 hover:scale-[1.02]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border ${accentStyles[accent]}`}>
        {icon}
      </div>
      <p className={`text-3xl font-bold tracking-tight ${valueAccentStyles[accent]}`}>{value}</p>
      <p className="mt-1 text-sm text-datadenkt-white/70">{title}</p>
    </div>
  )
}
