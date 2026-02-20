'use client'

type StatCardProps = {
  title: string
  value: string | number
  subtitle?: string
  variant?: 'default' | 'success' | 'danger' | 'muted'
  trend?: { value: number; label?: string }
  className?: string
}

const valueClass: Record<NonNullable<StatCardProps['variant']>, string> = {
  default: 'text-textPrimary',
  success: 'text-success',
  danger: 'text-danger',
  muted: 'text-textSecondary',
}

export function StatCard({
  title,
  value,
  subtitle,
  variant = 'default',
  trend,
  className = '',
}: StatCardProps) {
  const trendUp = trend != null && trend.value >= 0
  return (
    <div
      className={`rounded-[14px] bg-card border border-border shadow-sm p-5 transition-all duration-[180ms] ease-out hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      <p className="text-xs font-medium text-textSecondary uppercase tracking-wide">{title}</p>
      <p className={`mt-1 text-[32px] font-bold leading-tight tabular-nums ${valueClass[variant]}`}>
        {value}
      </p>
      {trend != null && (
        <p
          className={`mt-1 text-sm font-medium ${trendUp ? 'text-success' : 'text-danger'}`}
        >
          {trendUp ? '+' : ''}{trend!.value}% {trendUp ? '↑' : '↓'}
        </p>
      )}
      {subtitle != null && <p className="mt-0.5 text-sm text-textSecondary">{subtitle}</p>}
    </div>
  )
}
