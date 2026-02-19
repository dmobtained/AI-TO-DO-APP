'use client'

import {
  LayoutDashboard,
  ListTodo,
  Mail,
  Settings,
  Wallet,
  Award,
  Car,
  Briefcase,
  StickyNote,
  Users,
  Banknote,
  User,
  Shield,
  type LucideIcon,
} from 'lucide-react'

export type SidebarSubItem = { path: string; label: string }

export type SidebarItem = {
  path: string
  label: string
  icon: LucideIcon
  adminOnly?: boolean
  /** Sub-items for dropdown (e.g. Financiën → Bank, Vaste lasten, …) */
  children?: SidebarSubItem[]
}

/** Single source of truth for sidebar order. Admin last, adminOnly. */
export const SIDEBAR_ITEMS: SidebarItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/taken', label: 'Taken', icon: ListTodo },
  { path: '/dashboard/email', label: 'E-mail', icon: Mail },
  { path: '/dashboard/instellingen', label: 'Instellingen', icon: Settings },
  {
    path: '/dashboard/financien',
    label: 'Financiën',
    icon: Wallet,
    children: [
      { path: '/dashboard/financien/bank', label: 'Bank' },
      { path: '/dashboard/financien/lasten', label: 'Vaste lasten' },
      { path: '/dashboard/financien/belasting', label: 'Belasting' },
      { path: '/dashboard/financien/beleggen', label: 'Beleggen' },
    ],
  },
  { path: '/goud', label: 'Goud', icon: Award },
  { path: '/auto', label: 'Auto', icon: Car },
  { path: '/business', label: 'Business', icon: Briefcase },
  { path: '/notities', label: 'Notities', icon: StickyNote },
  { path: '/vergaderingen', label: 'Vergaderingen', icon: Users },
  { path: '/valuta', label: 'Valuta', icon: Banknote },
  { path: '/persoonlijke-info', label: 'Persoonlijke info', icon: User },
  { path: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
]

export function getSidebarItems(role: 'admin' | 'user'): SidebarItem[] {
  return SIDEBAR_ITEMS.filter((item) => !item.adminOnly || role === 'admin')
}
