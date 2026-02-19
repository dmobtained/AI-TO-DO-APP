'use client'

import { StatCard } from '@/components/ui/StatCard'

export type StatCardConfig = {
  title: string
  value: string | number
  subtitle?: string
  variant?: 'default' | 'success' | 'danger' | 'muted'
}

type ModuleStatCardsProps = {
  cards: StatCardConfig[]
  className?: string
}

export function ModuleStatCards({ cards, className = '' }: ModuleStatCardsProps) {
  if (cards.length === 0) return null
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(4, cards.length)} gap-4 ${className}`}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(160px, 1fr))` }}
    >
      {cards.map((card, i) => (
        <StatCard
          key={i}
          title={card.title}
          value={card.value}
          subtitle={card.subtitle}
          variant={card.variant}
        />
      ))}
    </div>
  )
}
