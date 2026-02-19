'use client'

type BadgeVariant = 'success' | 'danger' | 'warning' | 'neutral'

const variantClass: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  danger: 'bg-red-50 text-red-600 border-red-200',
  warning: 'bg-amber-50 text-amber-600 border-amber-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
}

export function Badge({
  variant = 'neutral',
  className = '',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium ${variantClass[variant]} ${className}`}
      {...props}
    />
  )
}
