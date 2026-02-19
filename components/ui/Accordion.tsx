'use client'

import { createContext, useContext, useState, useCallback } from 'react'

type AccordionContextValue = {
  open: string | null
  setOpen: (v: string | null) => void
  type: 'single' | 'multiple'
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

export function Accordion({
  type = 'single',
  defaultValue,
  children,
  className = '',
}: {
  type?: 'single' | 'multiple'
  defaultValue?: string | null
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState<string | null>(defaultValue ?? null)
  return (
    <AccordionContext.Provider value={{ open, setOpen, type }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  )
}

export function AccordionItem({
  value,
  children,
  className = '',
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`border-b border-[#e5e7eb] last:border-0 ${className}`} data-value={value}>
      {children}
    </div>
  )
}

export function AccordionTrigger({
  value,
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = useContext(AccordionContext)
  const isOpen = ctx?.open === value
  const toggle = useCallback(() => {
    if (!ctx) return
    ctx.setOpen(isOpen ? null : value)
  }, [ctx, isOpen, value])
  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex w-full items-center justify-between py-4 px-1 text-left text-sm font-medium text-slate-900 hover:bg-slate-50 rounded-lg transition-colors ${className}`}
      {...props}
    >
      {children}
      <span className={`shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </span>
    </button>
  )
}

export function AccordionContent({
  value,
  children,
  className = '',
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const ctx = useContext(AccordionContext)
  if (ctx?.open !== value) return null
  return <div className={`pb-4 pt-0 text-sm text-slate-600 ${className}`}>{children}</div>
}
