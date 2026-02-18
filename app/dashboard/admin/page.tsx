"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthProvider'
import { UserTable, type AdminUser } from '@/components/admin/UserTable'
import { useToast } from '@/context/ToastContext'
import { FEATURE_KEYS, type FeatureKey } from '@/lib/feature-flags'

type ModuleRow = {
  id: string
  name: string
  slug?: string
  is_active?: boolean
  status?: string
  order_index?: number
  position?: number
}

export default function DashboardAdminPage() {
  const router = useRouter()
  const { role, loading: authLoading } = useAuth()
  const toast = useToast()
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [modulesLoading, setModulesLoading] = useState(true)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [moduleTogglingId, setModuleTogglingId] = useState<string | null>(null)
  const [serviceRoleConfigured, setServiceRoleConfigured] = useState<boolean | null>(null)
  const [lastAuthMetadataUpdated, setLastAuthMetadataUpdated] = useState<boolean | null>(null)

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch('/api/modules?admin=1', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setModules(data.modules ?? [])
      } else {
        setModules([])
      }
    } catch {
      setModules([])
      toast('Modules laden mislukt', 'error')
    } finally {
      setModulesLoading(false)
    }
  }, [toast])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' })
      if (res.status === 503) {
        setServiceRoleConfigured(false)
        setUsers([])
        return
      }
      setServiceRoleConfigured(true)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users ?? [])
      } else {
        setUsers([])
      }
    } catch {
      setUsers([])
      toast('Gebruikers laden mislukt', 'error')
    } finally {
      setUsersLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (authLoading) return
    if (!role || role !== 'ADMIN') {
      router.replace('/dashboard')
      return
    }
    fetchModules()
    fetchUsers()
  }, [role, authLoading, router, fetchModules, fetchUsers])

  const handleRoleChange = useCallback(async (userRow: AdminUser) => {
    const nextRole = userRow.role === 'ADMIN' ? 'USER' : 'ADMIN'
    setUpdatingId(userRow.id)
    setUsers((prev) => prev.map((u) => (u.id === userRow.id ? { ...u, role: nextRole } : u)))
    try {
      const res = await fetch(`/api/admin/users/${userRow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast(data.error ?? 'Rol bijwerken mislukt', 'error')
        setUsers((prev) => prev.map((u) => (u.id === userRow.id ? { ...u, role: userRow.role } : u)))
      } else {
        setLastAuthMetadataUpdated(data.auth_metadata_updated ?? null)
        toast(`Rol gewijzigd naar ${nextRole}`)
      }
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === userRow.id ? { ...u, role: userRow.role } : u)))
      toast('Rol bijwerken mislukt', 'error')
    } finally {
      setUpdatingId(null)
    }
  }, [toast])

  const keyToModule = (key: FeatureKey): ModuleRow | undefined => {
    const k = key.toLowerCase().replace(/-/g, '_')
    return modules.find((m) => {
      const name = (m.name ?? '').toLowerCase().replace(/-/g, '_')
      const slug = (m.slug ?? '').toLowerCase().replace(/-/g, '_')
      return name === k || slug === k
    })
  }

  const handleModuleToggle = useCallback(async (moduleId: string, current: boolean) => {
    setModuleTogglingId(moduleId)
    try {
      const res = await fetch(`/api/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current }),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Module bijwerken mislukt', 'error')
        return
      }
      toast('Module bijgewerkt')
      await fetchModules()
    } catch {
      toast('Module bijwerken mislukt', 'error')
    } finally {
      setModuleTogglingId(null)
    }
  }, [toast, fetchModules])

  if (authLoading || role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="mt-4 h-4 w-64 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Admin</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Gebruikers en feature flags (modules)</p>

      {lastAuthMetadataUpdated === false && (
        <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Rol in profiles is bijgewerkt. Auth user_metadata kon niet worden bijgewerkt (SUPABASE_SERVICE_ROLE_KEY niet geconfigureerd).
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Users</h2>
        {serviceRoleConfigured === false && (
          <p className="text-amber-700 dark:text-amber-300 text-sm mb-2">
            SUPABASE_SERVICE_ROLE_KEY is niet geconfigureerd. Gebruikerslijst en auth metadata-updates zijn niet beschikbaar. Alleen profiles.role kan worden aangepast via API.
          </p>
        )}
        <UserTable
          users={users}
          loading={usersLoading}
          updatingId={updatingId}
          onRoleChange={handleRoleChange}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Feature flags (Modules)</h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs mb-2">Zet modules aan of uit. Onbekende keys worden niet automatisch aangemaakt.</p>
        <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          {modulesLoading ? (
            <div className="px-6 py-12 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="text-left px-6 py-3 text-slate-600 dark:text-slate-300 font-medium">Key / Naam</th>
                  <th className="text-left px-6 py-3 text-slate-600 dark:text-slate-300 font-medium">Status</th>
                  <th className="text-right px-6 py-3 text-slate-600 dark:text-slate-300 font-medium w-28">Aan / Uit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {FEATURE_KEYS.map((key) => {
                  const mod = keyToModule(key)
                  const enabled = mod ? (mod.is_active ?? mod.status === 'live') : undefined
                  return (
                    <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {key}
                        {!mod && <span className="ml-2 text-slate-400 text-xs">(unknown/missing)</span>}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        {enabled === undefined ? '—' : enabled ? 'Aan' : 'Uit'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {mod ? (
                          <button
                            type="button"
                            disabled={moduleTogglingId === mod.id}
                            onClick={() => handleModuleToggle(mod.id, !!enabled)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              enabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
                            } disabled:opacity-50`}
                          >
                            {moduleTogglingId === mod.id ? 'Bezig…' : enabled ? 'Uit' : 'Aan'}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-2 text-slate-500 dark:text-slate-400 text-xs">Module-rijen in de database met name of slug gelijk aan een key hierboven worden getoond. Ontbrekende keys worden niet automatisch aangemaakt.</p>
      </section>
    </div>
  )
}
