'use client'

import { forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white border-transparent hover:scale-[1.02]',
  secondary: 'bg-hover text-textPrimary border border-border hover:bg-border',
  ghost: 'bg-transparent text-textSecondary border-transparent hover:bg-hover',
  danger: 'bg-danger text-white border-transparent hover:opacity-90',
}

const baseClass =
  'inline-flex items-center justify-center rounded-[10px] font-medium border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none px-4 py-2.5 text-sm'

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(({ variant = 'primary', className = '', ...props }, ref) => (
  <button ref={ref} className={`${baseClass} ${variantClass[variant]} ${className}`} {...props} />
))
Button.displayName = 'Button'
