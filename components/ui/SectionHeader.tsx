'use client'

type SectionHeaderProps = {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, subtitle, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${className}`}>
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">{title}</h1>
        {subtitle != null && <p className="text-sm text-textSecondary mt-0.5">{subtitle}</p>}
      </div>
      {action != null && <div className="shrink-0">{action}</div>}
    </div>
  )
}
