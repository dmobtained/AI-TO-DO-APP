'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthProvider'
import type { User } from '@supabase/supabase-js'

/**
 * Use on dashboard pages: returns user and loading.
 * If AuthProvider has not yet set user, tries getSession() once so content still renders.
 */
export function useDashboardUser(): { user: User | null; loading: boolean } {
  const { user: authUser, loading: authLoading } = useAuth()
  const [sessionUser, setSessionUser] = useState<User | null>(null)
  const [sessionTried, setSessionTried] = useState(false)

  useEffect(() => {
    if (authLoading || authUser) return
    if (sessionTried) return
    setSessionTried(true)
    getSupabaseClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) setSessionUser(session.user)
      })
      .catch(() => {})
  }, [authLoading, authUser, sessionTried])

  const user = authUser ?? sessionUser
  const loading = authLoading && !sessionUser

  return { user, loading }
}
