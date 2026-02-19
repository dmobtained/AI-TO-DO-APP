'use client'

import { forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-[#2563eb] text-white hover:bg-[#1e40af] border-transparent',
  secondary: 'bg-white text-slate-700 border border-[#e5e7eb] hover:bg-slate-50',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-transparent',
}

const baseClass =
  'inline-flex items-center justify-center rounded-xl font-medium border shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none px-4 py-2.5 text-sm'

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(({ variant = 'primary', className = '', ...props }, ref) => (
  <button ref={ref} className={`${baseClass} ${variantClass[variant]} ${className}`} {...props} />
))
Button.displayName = 'Button'
