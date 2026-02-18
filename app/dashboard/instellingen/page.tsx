'use client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/browser'
import { useAuth } from '@/context/AuthProvider'
import { useDashboard } from '@/context/DashboardContext'
import { useDeveloperMode } from '@/context/DeveloperModeContext'

const EMAIL_ENABLED_KEY = 'email_enabled_'

export default function InstellingenPage() {
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
        <div className="h-8 w-48 rounded bg-slate-200 animate-pulse" />
      </div>
    )
  }

  const showEmailToggle = canSee('email_module')

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900">Instellingen</h1>
      <p className="text-slate-500 text-sm mt-0.5">Accountgegevens</p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Email</label>
          <p className="text-slate-900">{user.email ?? '—'}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Rol</label>
          <p className="text-slate-900">{role === 'ADMIN' ? 'admin' : 'user'}</p>
        </div>

        {role === 'ADMIN' && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-700">Developer Mode</p>
              <p className="text-xs text-slate-500 mt-0.5">Extra debug en admin tools</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={developerMode}
              onClick={() => handleDeveloperModeToggle(!developerMode)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                developerMode ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${developerMode ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
        )}

        {showEmailToggle && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <label className="text-sm font-medium text-slate-700">E-mail koppeling aan</label>
            <button
              type="button"
              role="switch"
              aria-checked={emailEnabled}
              onClick={toggleEmail}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                emailEnabled ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${emailEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-300 transition-colors"
          >
            Uitloggen
          </button>
        </div>
      </div>

      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={cancelDeveloperMode}>
          <div className="rounded-xl bg-white p-6 shadow-xl max-w-sm w-full border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-900 mb-2">Developer Mode</h3>
            <p className="text-sm text-slate-600 mb-6">
              Weet je zeker dat je Developer Mode wilt inschakelen?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={cancelDeveloperMode}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={confirmDeveloperMode}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
