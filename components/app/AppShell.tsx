'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { FeatureFlags } from '@/lib/feature-flags'
import type { ModuleStatus } from '@/lib/dashboard-auth'
import { DashboardProvider } from '@/context/DashboardContext'
import { getSidebarItems } from '@/lib/sidebar-config'
import { Menu, X } from 'lucide-react'

type AppShellProps = {
  session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null
  role: 'admin' | 'user'
  flags: FeatureFlags
  profileEmail: string | null
  profileName: string | null
  moduleStatus: ModuleStatus
  children: React.ReactNode
}

export function AppShell({
  session,
  role,
  flags,
  profileEmail,
  profileName,
  moduleStatus,
  children,
}: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!session) {
      router.replace('/')
      return
    }
  }, [session, router])

  useEffect(() => {
    if (!mounted) return
    const format = () =>
      setCurrentTime(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }))
    format()
    const t = setInterval(format, 1000)
    return () => clearInterval(t)
  }, [mounted])

  const items = getSidebarItems(role)
  const displayName =
    profileName ??
    (session?.user.user_metadata?.full_name as string | undefined) ??
    (session?.user.user_metadata?.name as string | undefined) ??
    profileEmail ??
    session?.user.email ??
    null
  const email = profileEmail ?? session?.user.email ?? '—'

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f6f8]">
        <div className="flex animate-pulse flex-col items-center gap-3">
          <div className="h-8 w-48 rounded-xl bg-slate-200" />
          <div className="h-4 w-32 rounded-xl bg-slate-200" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#f4f6f8] text-[#0f172a] antialiased">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-white/10 bg-[#111827] shadow-lg transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
            <span className="text-lg font-semibold tracking-wide text-white">DATADENKT</span>
            <button
              type="button"
              className="rounded-xl p-2 text-white/70 hover:bg-white/5 hover:text-white md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Menu sluiten"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-4">
            {items.map((item) => {
              const isActive =
                pathname === item.path ||
                (item.path !== '/dashboard' && pathname.startsWith(item.path))
              const Icon = item.icon
              const isAdminItem = item.adminOnly
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white transition-all ${
                    isAdminItem ? 'opacity-75' : ''
                  } ${
                    isActive
                      ? 'bg-white/10'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pl-0 md:pl-60">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#e5e7eb] bg-white px-4 shadow-sm md:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Menu openen"
            >
              <Menu className="h-6 w-6" />
            </button>
            {pathname !== '/dashboard' && (
              <p className="truncate text-sm font-semibold text-slate-900">{displayName ? `Welkom, ${displayName}` : 'Welkom'}</p>
            )}
            <span className="tabular-nums text-sm text-slate-500" suppressHydrationWarning>
              {mounted ? currentTime : '--:--'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="max-w-[120px] truncate text-xs text-slate-500 md:max-w-[180px]" title={email}>
              {email}
            </span>
            <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563eb] font-medium text-white">
              {(displayName ?? email).slice(0, 1).toUpperCase()}
            </span>
            <span
              className={`hidden rounded-lg border px-2 py-0.5 text-xs font-medium sm:inline-flex ${
                role === 'admin' ? 'border-[#2563eb]/30 bg-[#2563eb]/10 text-[#2563eb]' : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {role === 'admin' ? 'admin' : 'user'}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-[#f4f6f8] p-6 md:p-8">
          <DashboardProvider flags={flags} role={role} profileName={displayName ?? profileEmail ?? session?.user.email ?? null}>
            <div className="animate-fade-in">{children}</div>
          </DashboardProvider>
        </main>
      </div>
    </div>
  )
}
