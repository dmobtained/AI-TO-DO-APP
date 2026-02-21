'use client'

import { useState, useCallback, useEffect } from 'react'

export type ModuleLockState = {
  locked: boolean
  reason: string | null
  loading: boolean
}

export function useModuleLock(moduleKey: string | null): ModuleLockState {
  const [locked, setLocked] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!moduleKey)

  const fetchLock = useCallback(async () => {
    if (!moduleKey) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/module-lock?moduleKey=${encodeURIComponent(moduleKey)}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setLocked(data.locked === true)
        setReason(data.reason ?? null)
      } else {
        setLocked(false)
        setReason(null)
      }
    } catch {
      setLocked(false)
      setReason(null)
    } finally {
      setLoading(false)
    }
  }, [moduleKey])

  useEffect(() => {
    fetchLock()
  }, [fetchLock])

  return { locked, reason, loading }
}
