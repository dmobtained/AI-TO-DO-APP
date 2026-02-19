'use client'

import { forwardRef } from 'react'

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#171a21] px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-[#3b82f6] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 transition-all duration-200 disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input ref={ref} className={`${inputClass} ${className}`} {...props} />
  )
)
Input.displayName = 'Input'
