'use client'

import { AuthProvider } from '@/context/AuthProvider'
import { ToastProvider } from '@/context/ToastContext'
import { DeveloperModeProvider } from '@/context/DeveloperModeContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DeveloperModeProvider>
        <ToastProvider>{children}</ToastProvider>
      </DeveloperModeProvider>
    </AuthProvider>
  )
}
