/** Canonical list of module keys for locks and guard. */

export const MODULE_KEYS = [
  'tasks',
  'notes',
  'finance_entries',
  'debts',
  'agenda_events',
  'auto_entries',
  'recurring_expenses',
  'emails',
  'leads',
  'meeting_notes',
] as const

export const MODULE_LABELS: Record<string, string> = {
  tasks: 'Taken',
  notes: 'Notities',
  finance_entries: 'Financiën',
  debts: 'Schulden',
  agenda_events: 'Agenda',
  auto_entries: 'Auto',
  recurring_expenses: 'Lasten',
  emails: 'E-mail',
  leads: 'Leads',
  meeting_notes: 'Vergadernotities',
}

export type ModuleRow = {
  module_key: string
  label: string
  is_locked: boolean
  reason: string | null
  locked_by: string | null
  updated_at: string | null
}
