'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { FeatureFlags } from '@/lib/feature-flags'
import type { ModuleStatus } from '@/lib/dashboard-auth'
import { DashboardProvider } from '@/context/DashboardContext'
import { getSidebarItems } from '@/lib/sidebar-config'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react'

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
  const [financienOpen, setFinancienOpen] = useState(false)
  const [instellingenOpen, setInstellingenOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (pathname.startsWith('/dashboard/financien')) setFinancienOpen(true)
  }, [pathname])

  useEffect(() => {
    if (pathname.startsWith('/dashboard/instellingen') || pathname.startsWith('/notities')) setInstellingenOpen(true)
  }, [pathname])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false)
    }
    if (userMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [userMenuOpen])

  const handleSignOut = async () => {
    setUserMenuOpen(false)
    await getSupabaseClient().auth.signOut()
    router.push('/')
  }

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
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex animate-pulse flex-col items-center gap-3">
          <div className="h-8 w-48 rounded-[14px] bg-border" />
          <div className="h-4 w-32 rounded-[14px] bg-border" />
        </div>
      </div>
    )
  }

  const linkBase = 'flex min-w-0 flex-1 items-center gap-3 rounded-[10px] px-2 py-2.5 text-left text-sm font-medium transition-all duration-[180ms]'
  const linkDefault = 'text-primary/90 hover:bg-white/20 hover:text-textPrimary'
  const linkActive = 'bg-white/25 text-textPrimary font-semibold border-l-[3px] border-l-primary'

  return (
    <div className="flex h-screen bg-background text-textPrimary antialiased transition-all duration-[180ms]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-30 flex h-full w-[240px] flex-col border-r border-primary/20 bg-primarySoft transition-transform duration-[180ms] ease-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-primary/20 px-4">
            <span className="text-lg font-semibold tracking-wide text-primary">DATADENKT</span>
            <button
              type="button"
              className="rounded-[10px] p-2 text-primary/90 hover:bg-white/20 hover:text-textPrimary md:hidden transition-colors duration-[180ms]"
              onClick={() => setSidebarOpen(false)}
              aria-label="Menu sluiten"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-4">
            {items.map((item) => {
              const hasChildren = item.children && item.children.length > 0
              const isFinancien = item.path === '/dashboard/financien'
              const isInstellingen = item.path === '/dashboard/instellingen'
              const isOpen = isFinancien ? financienOpen : isInstellingen ? instellingenOpen : false
              const isActive =
                pathname === item.path ||
                (item.path !== '/dashboard' && pathname.startsWith(item.path))
              const Icon = item.icon
              const isAdminItem = item.adminOnly

              if (hasChildren) {
                return (
                  <div key={item.path} className="space-y-0.5">
                    <div className="flex min-w-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (isFinancien) setFinancienOpen((o) => !o)
                          if (isInstellingen) setInstellingenOpen((o) => !o)
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-primary/90 hover:bg-white/20 hover:text-textPrimary transition-colors duration-[180ms]"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? 'Submenu sluiten' : 'Submenu openen'}
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <Link
                        href={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`${linkBase} ${isAdminItem ? 'opacity-90' : ''} ${isActive ? linkActive : linkDefault}`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </div>
                    {isOpen && item.children && (
                      <div className="ml-4 flex flex-col border-l border-border pl-3">
                        {item.children.map((sub) => {
                          const subActive = pathname === sub.path
                          return (
                            <Link
                              key={sub.path}
                              href={sub.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`mt-0.5 rounded-[10px] px-2 py-2 text-sm transition-colors duration-[180ms] hover:bg-white/20 ${
                                subActive ? 'bg-white/25 font-semibold text-textPrimary' : 'text-primary/90 hover:text-textPrimary'
                              }`}
                            >
                              {sub.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`${linkBase} ${isAdminItem ? 'opacity-90' : ''} ${isActive ? linkActive : linkDefault}`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pl-0 md:pl-[240px]">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard" className="flex shrink-0 items-center" aria-label="DataDenkt home">
              <Image
                src="/datadenkt-logo.png"
                alt="DataDenkt"
                width={120}
                height={36}
                className="h-9 w-auto object-contain"
                priority
              />
            </Link>
            <button
              type="button"
              className="rounded-[10px] p-2 text-textSecondary hover:bg-hover hover:text-textPrimary md:hidden transition-colors duration-[180ms]"
              onClick={() => setSidebarOpen(true)}
              aria-label="Menu openen"
            >
              <Menu className="h-6 w-6" />
            </button>
            {pathname !== '/dashboard' && (
              <p className="truncate text-sm font-semibold text-textPrimary">{displayName ? `Welkom, ${displayName}` : 'Welkom'}</p>
            )}
            <span className="tabular-nums text-sm text-textSecondary" suppressHydrationWarning>
              {mounted ? currentTime : '--:--'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3" ref={userMenuRef}>
            <span className="max-w-[120px] truncate text-xs text-textSecondary md:max-w-[180px]" title={email}>
              {email}
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="Gebruikersmenu"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-white">
                  {(displayName ?? email).slice(0, 1).toUpperCase()}
                </span>
              </button>
              {userMenuOpen && (
                <>
                  <div className="absolute right-2 top-full z-50 h-0 w-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-card" style={{ marginTop: '2px' }} aria-hidden />
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-48 rounded-[14px] border border-border bg-card py-1 shadow-md"
                    role="menu"
                  >
                    <div className="px-4 py-2.5 border-b border-border text-sm font-medium text-textPrimary">
                      {displayName ?? email}
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-textSecondary hover:bg-hover hover:text-textPrimary transition-colors duration-[180ms]"
                      role="menuitem"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/persoonlijke-info"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-textSecondary hover:bg-hover hover:text-textPrimary transition-colors duration-[180ms]"
                      role="menuitem"
                    >
                      Persoonsgegevens
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="block w-full px-4 py-2.5 text-left text-sm text-textSecondary hover:bg-hover hover:text-textPrimary transition-colors duration-[180ms]"
                      role="menuitem"
                    >
                      Uitloggen
                    </button>
                  </div>
                </>
              )}
            </div>
            <span
              className={`hidden rounded-[10px] border px-2 py-0.5 text-xs font-medium sm:inline-flex ${
                role === 'admin' ? 'border-primary/40 bg-primarySoft text-primary' : 'border-border bg-hover text-textSecondary'
              }`}
            >
              {role === 'admin' ? 'admin' : 'user'}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background p-8">
          <DashboardProvider flags={flags} role={role} profileName={displayName ?? profileEmail ?? session?.user.email ?? null}>
            <div className="animate-fade-in">{children}</div>
          </DashboardProvider>
        </main>
      </div>
    </div>
  )
}
