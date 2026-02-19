'use client'

import { forwardRef } from 'react'

const cardClass =
  'rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200 bg-[#171a21] border border-white/5'

export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`${cardClass} ${className}`} {...props} />
  )
)
Card.displayName = 'Card'

export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-6 py-4 border-b border-white/5 ${className}`} {...props} />
}

export function CardTitle({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-lg font-semibold text-white ${className}`} {...props} />
}

export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 ${className}`} {...props} />
}
