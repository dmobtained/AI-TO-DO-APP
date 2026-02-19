'use client'

type StatCardProps = {
  title: string
  value: string | number
  subtitle?: string
  variant?: 'default' | 'success' | 'danger' | 'muted'
  className?: string
}

const valueClass: Record<NonNullable<StatCardProps['variant']>, string> = {
  default: 'text-slate-900',
  success: 'text-emerald-600',
  danger: 'text-red-600',
  muted: 'text-slate-500',
}

export function StatCard({ title, value, subtitle, variant = 'default', className = '' }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-sm border border-[#e5e7eb] p-6 transition-all duration-200 hover:shadow-md ${className}`}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass[variant]}`}>{value}</p>
      {subtitle != null && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}
