'use client'

import { forwardRef } from 'react'

const inputClass =
  'w-full rounded-[10px] border border-border bg-card px-4 py-2.5 text-sm text-textPrimary placeholder:text-textSecondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input ref={ref} className={`${inputClass} ${className}`} {...props} />
  )
)
Input.displayName = 'Input'
