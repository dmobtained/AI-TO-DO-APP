'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type ToastContextValue = {
  toast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const [type, setType] = useState<'success' | 'error' | 'info'>('success')

  const toast = useCallback((msg: string, t: 'success' | 'error' | 'info' = 'success') => {
    setMessage(msg)
    setType(t)
    const timer = setTimeout(() => setMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {message && (
        <div
          className={`fixed bottom-4 right-4 z-[100] rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            type === 'error' ? 'bg-red-600 text-white' : type === 'info' ? 'bg-slate-700 text-white' : 'bg-emerald-600 text-white'
          }`}
          role="alert"
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  return ctx?.toast ?? (() => {})
}
