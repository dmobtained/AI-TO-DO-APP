/**
 * Shared types for Module Engine.
 * Single source of truth for roles = public.profiles.role.
 */

export type AppRole = 'admin' | 'user'

export type ModuleSlug =
  | 'notities'
  | 'auto'
  | 'vergaderingen'
  | 'valuta'
  | 'business'
  | 'persoonlijke_info'
  | 'financien'
  | 'dashboard'

export type AuditAction = string // e.g. 'notes.create', 'notes.update'
