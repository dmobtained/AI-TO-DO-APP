'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthProvider'
import type { User } from '@supabase/supabase-js'

/**
 * Use on dashboard pages: returns user and loading.
 * Always tries getSession() as fallback so content renders even if AuthProvider is slow.
 */
export function useDashboardUser(): { user: User | null; loading: boolean } {
  const { user: authUser, loading: authLoading } = useAuth()
  const [sessionUser, setSessionUser] = useState<User | null>(null)
  const [sessionTried, setSessionTried] = useState(false)

  useEffect(() => {
    if (sessionTried) return
    setSessionTried(true)
    getSupabaseClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) setSessionUser(session.user)
      })
      .catch(() => {})
  }, [sessionTried])

  const user = authUser ?? sessionUser
  const loading = authLoading && !sessionUser && !authUser

  return { user, loading }
}
