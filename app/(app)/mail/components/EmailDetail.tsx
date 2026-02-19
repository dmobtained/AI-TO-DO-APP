'use client'

import type { Email } from '../types'
import { AIReplyBox } from './AIReplyBox'
import { Mail } from 'lucide-react'

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
      <div className="flex flex-col items-center justify-center h-full min-h-[320px] p-8 text-center">
        <div className="rounded-full bg-slate-100 p-4 text-slate-400">
          <Mail className="h-10 w-10" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-900">Geen e-mail geselecteerd</p>
        <p className="mt-1 text-sm text-slate-500">Kies een bericht in de inbox om te lezen</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-6">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e5e7eb]">
            <h1 className="text-lg font-semibold text-slate-900">
              {email.subject || 'Geen onderwerp'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Van: {email.sender || 'Onbekend'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {formatFullDate(email.created_at)}
            </p>
          </div>
          <div className="px-6 py-4">
            <div className="text-sm text-slate-700 whitespace-pre-wrap">
              {email.body || 'Geen inhoud'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
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
