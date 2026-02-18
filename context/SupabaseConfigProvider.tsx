'use client'

import { useEffect, useState } from 'react'
import { resetSupabaseClient } from '@/lib/supabaseClient'

declare global {
  interface Window {
    __SUPABASE_ENV__?: { url: string; key: string }
  }
}

type Status = 'loading' | 'ready' | 'missing_config'

export function SupabaseConfigProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    const hasEnv =
      typeof window !== 'undefined' &&
      window.__SUPABASE_ENV__?.url &&
      window.__SUPABASE_ENV__?.key

    if (hasEnv) {
      setStatus('ready')
      return
    }

    let cancelled = false
    fetch('/api/config')
      .then((res) => {
        if (!res.ok) return { nextPublicSupabaseUrl: '', nextPublicSupabaseAnonKey: '' }
        return res.json()
      })
      .then((data: { nextPublicSupabaseUrl?: string; nextPublicSupabaseAnonKey?: string }) => {
        if (cancelled) return
        const url = (data?.nextPublicSupabaseUrl ?? '').trim()
        const key = (data?.nextPublicSupabaseAnonKey ?? '').trim()
        if (url && key) {
          window.__SUPABASE_ENV__ = { url, key }
          resetSupabaseClient()
          setStatus('ready')
        } else {
          setStatus('missing_config')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('missing_config')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-datadenkt-navy flex items-center justify-center">
        <div className="text-datadenkt-white/70">Laden…</div>
      </div>
    )
  }

  if (status === 'missing_config') {
    return (
      <div className="min-h-screen bg-datadenkt-navy flex items-center justify-center px-4">
        <div className="max-w-md p-6 rounded-xl bg-datadenkt-navy-dark border border-red-500/30 text-datadenkt-white">
          <p className="font-semibold text-red-400 mb-2">Supabase niet geconfigureerd</p>
          <p className="text-sm text-datadenkt-white/80 mb-4">
            Zet op Railway bij Variables: <code className="bg-black/30 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> en <code className="bg-black/30 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Daarna opnieuw deployen.
          </p>
          <p className="text-xs text-datadenkt-white/60">
            Of controleer of <strong>/api/config</strong> bereikbaar is en de juiste waarden teruggeeft.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
