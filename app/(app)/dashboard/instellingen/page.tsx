"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthProvider'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { useDashboard } from '@/context/DashboardContext'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageContainer } from '@/components/ui/PageContainer'

const EMAIL_ENABLED_KEY = 'email_enabled_'

export default function InstellingenPage() {
  const supabase = getSupabaseClient()
  const router = useRouter()
  const { user, loading: authLoading } = useDashboardUser()
  const { role } = useAuth()
  const { canSee } = useDashboard()
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && user) {
      try {
        const v = localStorage.getItem(EMAIL_ENABLED_KEY + user.id)
        setEmailEnabled(v !== 'false')
      } catch {
        setEmailEnabled(true)
      }
    }
  }, [mounted, user?.id])

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/')
  }, [user, authLoading, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
    router.refresh()
  }

  const toggleEmail = () => {
    if (!user) return
    const next = !emailEnabled
    setEmailEnabled(next)
    try {
      localStorage.setItem(EMAIL_ENABLED_KEY + user.id, String(next))
    } catch {
      // ignore
    }
  }

  if (authLoading || !user) {
    return (
      <PageContainer>
        <SectionHeader title="Instellingen" subtitle="Accountgegevens" />
        <div className="mt-6 flex items-center gap-3 text-slate-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#2563eb]" />
          <span className="text-sm">Laden…</span>
        </div>
      </PageContainer>
    )
  }

  const showEmailToggle = canSee('email_module')

  return (
    <PageContainer>
      <SectionHeader title="Instellingen" subtitle="Accountgegevens" />

      <div className="mt-8 mx-auto max-w-md">
        <Card className="p-6">
          <CardContent className="p-0 space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Email</label>
              <p className="text-slate-900 font-medium">{user.email ?? '—'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Rol</label>
              <Badge variant="neutral">{role === 'admin' ? 'admin' : 'user'}</Badge>
            </div>

            {showEmailToggle && (
              <div className="flex items-center justify-between pt-4 border-t border-[#e5e7eb]">
                <label className="text-sm font-medium text-slate-900">E-mail koppeling aan</label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={emailEnabled}
                  onClick={toggleEmail}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-white ${emailEnabled ? 'bg-[#2563eb]' : 'bg-slate-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition translate-y-0.5 ${emailEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-[#e5e7eb]">
              <Button variant="secondary" onClick={handleLogout} className="w-full sm:w-auto">
                Uitloggen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
