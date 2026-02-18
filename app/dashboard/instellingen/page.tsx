"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthProvider'
import { useDashboard } from '@/context/DashboardContext'
import { useDeveloperMode } from '@/context/DeveloperModeContext'

const EMAIL_ENABLED_KEY = 'email_enabled_'

export default function InstellingenPage() {
  const supabase = getSupabaseClient()
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const { canSee } = useDashboard()
  const { isEnabled: developerMode, setEnabled: setDeveloperMode } = useDeveloperMode()
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [pendingEnable, setPendingEnable] = useState(false)

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

  const handleDeveloperModeToggle = (checked: boolean) => {
    if (checked) {
      setPendingEnable(true)
      setConfirmModalOpen(true)
    } else {
      setDeveloperMode(false)
    }
  }

  const confirmDeveloperMode = () => {
    setDeveloperMode(true)
    setConfirmModalOpen(false)
    setPendingEnable(false)
  }

  const cancelDeveloperMode = () => {
    setConfirmModalOpen(false)
    setPendingEnable(false)
  }

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="h-8 w-48 rounded bg-datadenkt-white/10 animate-pulse" />
      </div>
    )
  }

  const showEmailToggle = canSee('email_module')

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-datadenkt-white">Instellingen</h1>
      <p className="text-datadenkt-white/70 text-sm mt-0.5">Accountgegevens</p>

      <div className="mt-8 card-primary p-6 space-y-6">
        <div>
          <label className="block text-xs font-medium text-datadenkt-white/70 uppercase tracking-wide mb-1">Email</label>
          <p className="text-datadenkt-white">{user.email ?? '—'}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-datadenkt-white/70 uppercase tracking-wide mb-1">Rol</label>
          <p className="text-datadenkt-white">{role === 'ADMIN' ? 'admin' : 'user'}</p>
        </div>

        {role === 'ADMIN' && (
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div>
              <p className="text-sm font-medium text-datadenkt-white">Developer Mode</p>
              <p className="text-xs text-datadenkt-white/70 mt-0.5">Extra debug en admin tools</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={developerMode}
              onClick={() => handleDeveloperModeToggle(!developerMode)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-datadenkt-teal focus:ring-offset-2 focus:ring-offset-datadenkt-navy ${
                developerMode ? 'bg-datadenkt-teal' : 'bg-datadenkt-white/20'
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-datadenkt-white shadow ring-0 transition ${developerMode ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
        )}

        {showEmailToggle && (
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <label className="text-sm font-medium text-datadenkt-white">E-mail koppeling aan</label>
            <button
              type="button"
              role="switch"
              aria-checked={emailEnabled}
              onClick={toggleEmail}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-datadenkt-teal focus:ring-offset-2 focus:ring-offset-datadenkt-navy ${
                emailEnabled ? 'bg-datadenkt-teal' : 'bg-datadenkt-white/20'
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-datadenkt-white shadow ring-0 transition ${emailEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="btn-accent px-4 py-2.5 text-sm"
          >
            Uitloggen
          </button>
        </div>
      </div>

      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={cancelDeveloperMode}>
          <div className="card-primary p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-datadenkt-white mb-2">Developer Mode</h3>
            <p className="text-sm text-datadenkt-white/70 mb-6">
              Weet je zeker dat je Developer Mode wilt inschakelen?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={cancelDeveloperMode}
                className="rounded-xl bg-datadenkt-white/10 px-4 py-2 text-sm font-medium text-datadenkt-white hover:bg-datadenkt-white/20 transition-all duration-200"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={confirmDeveloperMode}
                className="btn-primary px-4 py-2 text-sm"
              >
                Inschakelen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
