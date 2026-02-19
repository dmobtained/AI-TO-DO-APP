'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { Session, User } from '@supabase/supabase-js'

type Role = 'admin' | 'user' | null

type AuthState = {
  user: User | null
  session: Session | null
  role: Role
  loading: boolean
}

const AuthContext = createContext<AuthState | null>(null)

function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError'
}

function getRoleFromMetadata(meta: unknown): Role {
  if (typeof meta !== 'string') return 'user'
  const u = meta.toLowerCase().trim()
  return u === 'admin' ? 'admin' : 'user'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseClient()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  const setAuth = useCallback((s: Session | null) => {
    setSession(s)
    setUser(s?.user ?? null)
    if (s?.user) {
      setRole(getRoleFromMetadata(s.user.user_metadata?.role))
    } else {
      setRole(null)
    }
  }, [])

  const fetchProfileRole = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
      const r = data?.role
      return (r != null && String(r).toLowerCase().trim() === 'admin') ? 'admin' : 'user'
    } catch (e) {
      if (isAbortError(e)) throw e
      return 'user'
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true
    let initialFired = false

    async function applySession(s: Session | null) {
      if (!mounted) return
      setAuth(s)
      if (s?.user) {
        const metaRole = getRoleFromMetadata(s.user.user_metadata?.role)
        if (metaRole !== 'admin') {
          try {
            const profileRole = await fetchProfileRole(s.user.id)
            if (mounted) setRole(profileRole)
          } catch (e) {
            if (!isAbortError(e) && mounted) setRole('user')
          }
        }
      }
      if (mounted) setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted || initialFired) return
      initialFired = true
      applySession(session)
    }).catch(() => {
      if (!mounted || initialFired) return
      initialFired = true
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return
      if (!initialFired) {
        initialFired = true
        await applySession(s)
        return
      }
      try {
        setAuth(s)
        if (s?.user && getRoleFromMetadata(s.user.user_metadata?.role) !== 'admin') {
          const profileRole = await fetchProfileRole(s.user.id)
          if (mounted) setRole(profileRole)
        }
      } catch (e) {
        if (!isAbortError(e) && mounted) setRole('user')
      }
    })

    const subscription = data.subscription
    const fallback = setTimeout(() => {
      if (mounted && !initialFired) {
        initialFired = true
        setLoading(false)
      }
    }, 2000)

    return () => {
      clearTimeout(fallback)
      mounted = false
      subscription?.unsubscribe()
    }
  }, [setAuth, fetchProfileRole])


  const value: AuthState = { user, session, role, loading }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
