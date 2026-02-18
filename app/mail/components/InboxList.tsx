'use client'

import type { Email } from '../types'
import { CATEGORY_BADGE } from '../types'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  if (sameDay) return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export function InboxList({
  emails,
  selectedId,
  onSelectEmail,
  disabled,
}: {
  emails: Email[]
  selectedId: string | null
  onSelectEmail: (email: Email) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">
            Geen e-mails
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {emails.map((email) => {
              const isSelected = selectedId === email.id
              const badgeClass = CATEGORY_BADGE[email.category ?? ''] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              return (
                <li key={email.id}>
                  <button
                    type="button"
                    onClick={() => !disabled && onSelectEmail(email)}
                    disabled={disabled}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-l-2 ${
                      isSelected
                        ? 'border-l-indigo-600 bg-slate-50 dark:bg-slate-800/70'
                        : 'border-l-transparent'
                    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate flex-1">
                        {email.subject || 'Geen onderwerp'}
                      </span>
                      {email.requires_action && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-amber-500" title="Vereist actie" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {email.sender || 'Onbekend'}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {formatDate(email.created_at)}
                      </span>
                      {email.category && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${badgeClass}`}>
                          {email.category}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
