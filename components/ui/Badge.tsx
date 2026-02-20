'use client'

type BadgeVariant = 'success' | 'danger' | 'warning' | 'neutral'

const variantClass: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  neutral: 'bg-hover text-textSecondary border-border',
}

export function Badge({
  variant = 'neutral',
  className = '',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={`inline-flex items-center rounded-xl border px-2 py-0.5 text-xs font-medium ${variantClass[variant]} ${className}`}
      {...props}
    />
  )
}
