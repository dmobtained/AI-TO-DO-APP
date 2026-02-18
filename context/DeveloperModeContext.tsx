'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'developer_mode'

type DeveloperModeContextValue = {
  isEnabled: boolean
  setEnabled: (value: boolean) => void
  requestEnable: () => void
}

const DeveloperModeContext = createContext<DeveloperModeContextValue | null>(null)

export function DeveloperModeProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setState] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      setState(stored === 'true')
    } catch {
      setState(false)
    }
  }, [mounted])

  const setEnabled = useCallback((value: boolean) => {
    setState(value)
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      // ignore
    }
  }, [])

  const requestEnable = useCallback(() => {
    setState(true)
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // ignore
    }
  }, [])

  const value: DeveloperModeContextValue = {
    isEnabled,
    setEnabled,
    requestEnable,
  }

  return (
    <DeveloperModeContext.Provider value={value}>
      {children}
    </DeveloperModeContext.Provider>
  )
}

export function useDeveloperMode(): DeveloperModeContextValue {
  const ctx = useContext(DeveloperModeContext)
  if (!ctx) {
    throw new Error('useDeveloperMode must be used within DeveloperModeProvider')
  }
  return ctx
}

export { STORAGE_KEY as DEVELOPER_MODE_STORAGE_KEY }
