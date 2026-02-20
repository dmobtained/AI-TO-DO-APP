'use client'

import { forwardRef } from 'react'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'hero'
  hoverLift?: boolean
}

const baseCardClass =
  'rounded-[14px] bg-card border border-border shadow-sm transition-all duration-[180ms] ease-out p-5'

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', hoverLift = true, ...props }, ref) => {
    const variantClass = variant === 'hero'
      ? 'bg-primarySoft border-l-4 border-l-primary p-6'
      : ''
    const liftClass = hoverLift
      ? 'hover:-translate-y-0.5 hover:shadow-md'
      : ''
    return (
      <div
        ref={ref}
        className={`${baseCardClass} ${variantClass} ${liftClass} ${className}`}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`pb-4 border-b border-border ${className}`}
      {...props}
    />
  )
}

export function CardTitle({
  className = '',
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { variant?: 'default' | 'hero' }) {
  const sizeClass = variant === 'hero' ? 'text-[20px]' : 'text-lg'
  return (
    <h2
      className={`font-semibold text-textPrimary ${sizeClass} ${className}`}
      {...props}
    />
  )
}

export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`pt-4 ${className}`} {...props} />
}
