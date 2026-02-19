'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { FeatureFlags } from '@/lib/feature-flags'
import type { ModuleStatus } from '@/lib/dashboard-auth'
import { DashboardProvider } from '@/context/DashboardContext'
import { useDeveloperMode } from '@/context/DeveloperModeContext'
import { ChevronDown, ChevronRight } from 'lucide-react'

const BASE_MENU_ICONS: Record<string, string> = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  taken: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  email: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  instellingen: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  admin: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
}

const BASE_MENU: { path: string; label: string; key: string }[] = [
  { path: '/dashboard', label: 'Dashboard', key: 'dashboard' },
  { path: '/dashboard/taken', label: 'Taken', key: 'taken' },
  { path: '/dashboard/email', label: 'E-mail', key: 'email' },
  { path: '/dashboard/instellingen', label: 'Instellingen', key: 'instellingen' },
]

const FINANCIEN_SUBITEMS: { path: string; label: string }[] = [
  { path: '/dashboard/financien', label: 'Overzicht' },
  { path: '/dashboard/financien/bank', label: 'Bank saldo' },
  { path: '/dashboard/financien/lasten', label: 'Vaste lasten' },
  { path: '/dashboard/financien/beleggen', label: 'Beleggen' },
  { path: '/dashboard/financien/belasting', label: 'Belasting' },
]

type DashboardShellProps = {
  session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null
  role: 'admin' | 'user'
  flags: FeatureFlags
  profileEmail: string | null
  profileName: string | null
  moduleStatus: ModuleStatus
  children: React.ReactNode
}

export function DashboardShell({
  session,
  role,
  flags,
  profileEmail,
  profileName,
  moduleStatus: initialModuleStatus,
  children,
}: DashboardShellProps) {
  const supabase = getSupabaseClient()
  const router = useRouter()
  const pathname = usePathname()
  const { isEnabled: developerMode } = useDeveloperMode()
  const [currentTime, setCurrentTime] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [financeOpen, setFinanceOpen] = useState(false)
  const [moduleStatus, setModuleStatus] = useState<ModuleStatus>(initialModuleStatus)
  const [togglingModule, setTogglingModule] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => {}
  }, [])

  useEffect(() => {
    setModuleStatus((prev) => ({ ...prev, ...initialModuleStatus }))
  }, [initialModuleStatus])

  useEffect(() => {
    if (!session) {
      router.replace('/')
      return
    }
  }, [session, router])

  useEffect(() => {
    if (pathname.startsWith('/dashboard/financien')) {
      setFinanceOpen(true)
    }
  }, [pathname])

  useEffect(() => {
    const channel = supabase
      .channel('modules-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'modules' },
        (payload) => {
          const row = payload.new as { name?: string; is_active?: boolean }
          const name = row?.name
          if (typeof name === 'string') {
            setModuleStatus((prev) => ({ ...prev, [name]: row.is_active === true }))
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleModuleToggle = useCallback(async (moduleName: string) => {
    const next = !moduleStatus[moduleName]
    setTogglingModule(moduleName)
    setModuleStatus((prev) => ({ ...prev, [moduleName]: next }))
    try {
      await supabase.from('modules').update({ is_active: next }).eq('name', moduleName)
    } catch {
      setModuleStatus((prev) => ({ ...prev, [moduleName]: !next }))
    } finally {
      setTogglingModule(null)
    }
  }, [moduleStatus])

  useEffect(() => {
    if (!mounted) return
    const format = () => {
      const d = new Date()
      setCurrentTime(d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }))
    }
    format()
    const t = setInterval(format, 1000)
    return () => clearInterval(t)
  }, [mounted])

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-datadenkt-navy">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-8 w-48 rounded-xl bg-white/10" />
          <div className="h-4 w-32 rounded-xl bg-white/10" />
        </div>
      </div>
    )
  }

  const displayName = profileName ?? (session.user.user_metadata?.full_name as string) ?? (session.user.user_metadata?.name as string) ?? profileEmail ?? session.user.email ?? null
  const greeting = displayName ? `Welkom terug ${displayName}!` : 'Welkom terug!'
  const email = profileEmail ?? session.user.email ?? '—'
  const contextDisplayName = displayName ?? profileEmail ?? session.user.email ?? null

  const sidebarItems = [...BASE_MENU]
  if (role === 'admin') {
    sidebarItems.push({ path: '/dashboard/admin', label: 'Admin', key: 'admin' })
  }

  return (
    <div className="flex h-screen bg-datadenkt-navy">
      {developerMode && (
        <div className="sticky top-0 left-0 right-0 z-40 flex items-center justify-center py-2 px-4 bg-datadenkt-orange/20 border-b border-datadenkt-orange/30 text-datadenkt-white text-sm font-medium">
          ⚙ Developer Mode actief
        </div>
      )}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-30 flex h-full w-64 flex-col justify-between py-6 border-r border-white/10 bg-datadenkt-navy-dark shadow-xl shadow-black/30 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex h-14 shrink-0 items-center justify-between px-6 border-b border-white/10">
            <span className="text-lg font-semibold tracking-wide text-datadenkt-white">DATADENKT</span>
            <button
              type="button"
              className="md:hidden rounded-xl p-2 text-datadenkt-white/70 hover:bg-datadenkt-navy-card hover:text-datadenkt-white transition-all duration-200"
              onClick={() => setSidebarOpen(false)}
              aria-label="Menu sluiten"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <nav className="flex-1 space-y-0.5 p-4 overflow-y-auto">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
              const icon = BASE_MENU_ICONS[item.key]
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex min-w-0 items-center gap-3 rounded-r-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 border-l-4 ${
                    isActive
                      ? 'border-datadenkt-orange bg-datadenkt-navy-card text-datadenkt-white'
                      : 'border-transparent text-datadenkt-white/70 hover:bg-datadenkt-navy-card hover:text-datadenkt-white'
                  }`}
                >
                  {icon && (
                    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                    </svg>
                  )}
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}

            {/* Financiën: voor alle ingelogde users */}
            <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setFinanceOpen((o) => !o)}
                  className="flex w-full items-center gap-3 rounded-r-xl px-3 py-2.5 text-left text-sm font-medium text-datadenkt-white/70 hover:bg-datadenkt-navy-card hover:text-datadenkt-white transition-all duration-200 border-l-4 border-transparent"
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="truncate flex-1">Financiën</span>
                  {financeOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                </button>
                {financeOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                    {FINANCIEN_SUBITEMS.map((sub) => {
                      const isSubActive = pathname === sub.path
                      return (
                        <Link
                          key={sub.path}
                          href={sub.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`block rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                            isSubActive ? 'bg-datadenkt-navy-card text-datadenkt-orange' : 'text-datadenkt-white/70 hover:text-datadenkt-white'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
                {role === 'admin' && (
                  <div className="flex justify-end mt-0.5 mr-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        if (togglingModule !== 'financien') handleModuleToggle('financien')
                      }}
                      disabled={togglingModule === 'financien'}
                      title={moduleStatus['financien'] !== false ? 'Module actief' : 'Developer mode actief'}
                      className={`shrink-0 min-w-[28px] h-6 rounded-lg px-1.5 flex items-center justify-center border text-xs ${
                        moduleStatus['financien'] !== false ? 'bg-datadenkt-teal/20 text-datadenkt-teal border-datadenkt-teal/30' : 'bg-datadenkt-orange/20 text-datadenkt-orange border-datadenkt-orange/30'
                      }`}
                      aria-label={moduleStatus['financien'] !== false ? 'Module actief' : 'Developer mode actief'}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    </button>
                  </div>
                )}
              </div>
          </nav>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0 pl-0 md:pl-64">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-datadenkt-navy/90 backdrop-blur-xl px-4 md:px-6">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              className="md:hidden rounded-xl p-2 text-datadenkt-white/70 hover:bg-datadenkt-navy-card hover:text-datadenkt-white transition-all duration-200"
              onClick={() => setSidebarOpen(true)}
              aria-label="Menu openen"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            {pathname !== '/dashboard' && (
              <p className="text-sm font-semibold text-datadenkt-white truncate">{greeting}</p>
            )}
            <span className="text-datadenkt-white/50 text-sm tabular-nums" suppressHydrationWarning>
              {mounted ? currentTime : '--:--'}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-datadenkt-white/60 truncate max-w-[120px] md:max-w-[180px]" title={email}>
              {email}
            </span>
            {developerMode && (
              <span className="text-xs text-datadenkt-orange/90 hidden sm:inline">Dev</span>
            )}
            <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-datadenkt-navy-card text-datadenkt-white font-medium ring-2 ring-datadenkt-teal">
              {(displayName ?? email).slice(0, 1).toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-datadenkt-teal ring-2 ring-datadenkt-navy" title="Online" />
            </span>
            <span className={`hidden sm:inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${role === 'admin' ? 'bg-datadenkt-teal/20 text-datadenkt-teal' : 'bg-datadenkt-white/10 text-datadenkt-white/70'}`}>
              {role === 'admin' ? 'admin' : 'user'}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-8">
          <DashboardProvider flags={flags} role={role} profileName={contextDisplayName}>
            <div className="animate-fade-in">
              {children}
            </div>
          </DashboardProvider>
        </main>
      </div>
    </div>
  )
}

export { type FeatureFlags }
