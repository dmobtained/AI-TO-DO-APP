'use client'

import { createContext, useContext, useState, useCallback } from 'react'

type TabsContextValue = {
  value: string
  onValueChange: (v: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className = '',
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  children: React.ReactNode
  className?: string
}) {
  const [internal, setInternal] = useState(defaultValue ?? '')
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internal
  const onValueChangeInternal = useCallback(
    (v: string) => {
      if (!isControlled) setInternal(v)
      onValueChange?.(v)
    },
    [isControlled, onValueChange]
  )
  return (
    <TabsContext.Provider value={{ value, onValueChange: onValueChangeInternal }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={`flex flex-wrap gap-1 rounded-[10px] bg-hover border border-border p-1 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = useContext(TabsContext)
  if (!ctx) return <button {...props}>{children}</button>
  const isActive = ctx.value === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx.onValueChange(value)}
      className={`rounded-[10px] px-4 py-2 text-sm font-medium transition-all duration-150 ${
        isActive ? 'bg-primary text-white' : 'text-textSecondary hover:text-textPrimary hover:bg-hover'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = useContext(TabsContext)
  if (!ctx || ctx.value !== value) return null
  return (
    <div role="tabpanel" className={`mt-4 ${className}`} {...props}>
      {children}
    </div>
  )
}
