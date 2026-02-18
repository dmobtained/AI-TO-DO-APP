'use client'

import type { ReactNode } from 'react'

type OverviewCardProps = {
  title: string
  value: string | number
  icon: ReactNode
  accent?: 'emerald' | 'blue' | 'red' | 'slate'
  delay?: number
}

const accentStyles = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

export function OverviewCard({ title, value, icon, accent = 'slate', delay = 0 }: OverviewCardProps) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-xl shadow-black/30 transition-all duration-200 ease-in-out hover:scale-[1.02] hover:border-white/20"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border ${accentStyles[accent]}`}>
        {icon}
      </div>
      <p className="text-3xl font-bold tracking-tight text-slate-100">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{title}</p>
    </div>
  )
}
