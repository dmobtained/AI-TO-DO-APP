'use client'

import { useEffect } from 'react'
import { SupabaseConfigProvider } from '@/context/SupabaseConfigProvider'
import { AuthProvider } from '@/context/AuthProvider'
import { ToastProvider } from '@/context/ToastContext'
import { DeveloperModeProvider } from '@/context/DeveloperModeContext'

function SuppressAuthAbortError() {
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const reason = e?.reason
      if (reason instanceof Error && reason.name === 'AbortError') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('unhandledrejection', handler)
    return () => window.removeEventListener('unhandledrejection', handler)
  }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SuppressAuthAbortError />
      <SupabaseConfigProvider>
        <AuthProvider>
          <DeveloperModeProvider>
            <ToastProvider>{children}</ToastProvider>
          </DeveloperModeProvider>
        </AuthProvider>
      </SupabaseConfigProvider>
    </>
  )
}
