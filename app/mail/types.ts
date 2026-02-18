export type Email = {
  id: string
  user_id: string
  sender: string | null
  subject: string | null
  body: string | null
  category: string | null
  requires_action: boolean
  amount: number | null
  due_date: string | null
  appointment_date: string | null
  created_at: string
}

export const CATEGORY_BADGE: Record<string, string> = {
  PAYMENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  APPOINTMENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  DEADLINE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  IMPORTANT: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  SPAM: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
}
