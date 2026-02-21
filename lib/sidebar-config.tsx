'use client'

import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  Mail,
  Settings,
  Wallet,
  Car,
  Briefcase,
  StickyNote,
  Users,
  Banknote,
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
  { path: '/dashboard/agenda', label: 'Agenda', icon: Calendar },
  {
    path: '/dashboard/financien',
    label: 'Financiën',
    icon: Wallet,
    children: [
      { path: '/dashboard/financien/bank', label: 'Bank' },
      { path: '/dashboard/financien', label: 'Snelle uitgaven' },
      { path: '/dashboard/financien/schulden', label: 'Schulden' },
      { path: '/dashboard/financien/beleggen', label: 'Beleggingen' },
    ],
  },
  { path: '/auto', label: 'Auto', icon: Car },
  { path: '/dashboard/email', label: 'Mail', icon: Mail },
  { path: '/dashboard/instellingen', label: 'Instellingen', icon: Settings },
  { path: '/notities', label: 'Notities', icon: StickyNote },
  { path: '/business', label: 'Business', icon: Briefcase },
  { path: '/vergaderingen', label: 'Vergaderingen', icon: Users },
  { path: '/valuta', label: 'Valuta', icon: Banknote },
  { path: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
]

export function getSidebarItems(role: 'admin' | 'user'): SidebarItem[] {
  return SIDEBAR_ITEMS.filter((item) => !item.adminOnly || role === 'admin')
}
