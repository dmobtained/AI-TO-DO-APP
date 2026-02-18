'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/browser'
import type { Session, User } from '@supabase/supabase-js'

type Role = 'ADMIN' | 'USER' | null

type AuthState = {
  user: User | null
  session: Session | null
  role: Role
  loading: boolean
}

const AuthContext = createContext<AuthState | null>(null)

function getRoleFromMetadata(meta: unknown): Role {
  if (typeof meta !== 'string') return 'USER'
  const u = meta.toUpperCase()
  return u === 'ADMIN' ? 'ADMIN' : 'USER'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
    return data?.role === 'ADMIN' ? 'ADMIN' : 'USER'
  }, [])

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        if (!mounted) return
        setAuth(s)
        if (s?.user) {
          const metaRole = getRoleFromMetadata(s.user.user_metadata?.role)
          if (metaRole !== 'ADMIN') {
            const profileRole = await fetchProfileRole(s.user.id)
            if (mounted) setRole(profileRole)
          }
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return
      setAuth(s)
      if (s?.user && getRoleFromMetadata(s.user.user_metadata?.role) !== 'ADMIN') {
        const profileRole = await fetchProfileRole(s.user.id)
        if (mounted) setRole(profileRole)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
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
