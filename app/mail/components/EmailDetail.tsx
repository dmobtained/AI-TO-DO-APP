'use client'

import type { Email } from '../types'
import { AIReplyBox } from './AIReplyBox'

function formatFullDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EmailDetail({
  email,
  draft,
  onDraftChange,
  onGenerateReply,
  replyLoading,
  replyError,
  onCopyDraft,
  disabled,
}: {
  email: Email | null
  draft: string
  onDraftChange: (value: string) => void
  onGenerateReply: () => void
  replyLoading: boolean
  replyError: string | null
  onCopyDraft: () => void
  disabled: boolean
}) {
  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 text-sm p-6">
        Selecteer een e-mail in de inbox
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {email.subject || 'Geen onderwerp'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Van: {email.sender || 'Onbekend'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {formatFullDate(email.created_at)}
            </p>
          </div>
          <div className="px-6 py-4">
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {email.body || 'Geen inhoud'}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            AI-antwoord
          </h2>
          <AIReplyBox
            draft={draft}
            onDraftChange={onDraftChange}
            onGenerate={onGenerateReply}
            loading={replyLoading}
            error={replyError}
            onCopy={onCopyDraft}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
