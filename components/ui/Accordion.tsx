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
    <div className={`border-b border-white/5 last:border-0 ${className}`} data-value={value}>
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
      className={`flex w-full items-center justify-between py-4 text-left text-sm font-medium text-white hover:text-white/90 ${className}`}
      {...props}
    >
      {children}
      <span className="shrink-0 text-white/60 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}>
        ▼
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
  return <div className={`pb-4 pt-0 text-sm text-white/80 ${className}`}>{children}</div>
}
