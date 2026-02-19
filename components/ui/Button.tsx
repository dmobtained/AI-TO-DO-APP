'use client'

import { forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90 focus:ring-[#3b82f6]/50',
  secondary: 'bg-white/10 text-white border border-white/10 hover:bg-white/15 focus:ring-white/20',
  ghost: 'text-white/80 hover:bg-white/5 hover:text-white focus:ring-white/10',
}

const baseClass =
  'inline-flex items-center justify-center rounded-xl font-medium shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f1115] disabled:opacity-50 disabled:pointer-events-none'

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(({ variant = 'primary', className = '', ...props }, ref) => (
  <button
    ref={ref}
    className={`${baseClass} ${variantClass[variant]} ${className}`}
    {...props}
  />
))
Button.displayName = 'Button'
