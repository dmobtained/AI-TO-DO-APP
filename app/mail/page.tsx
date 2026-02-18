"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/browser'
import { useAuth } from '@/context/AuthProvider'
import { useToast } from '@/context/ToastContext'
import type { Email } from './types'
import { InboxList } from './components/InboxList'
import { EmailDetail } from './components/EmailDetail'

const AI_HUB_WEBHOOK = 'https://datadenkt.app.n8n.cloud/webhook/ai-hub'

export default function MailPage() {
  const router = useRouter()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [draft, setDraft] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)
  const [developerModeMail, setDeveloperModeMail] = useState(false)
  const { user: authUser, role, loading: authLoading } = useAuth()
  const toast = useToast()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!authUser) {
      router.replace('/')
      return
    }
    setUser(authUser)
    setAuthChecked(true)
  }, [authUser, authLoading, router])

  useEffect(() => {
    if (!user?.id) return
    let mounted = true
    async function init() {
      const userId = user!.id
      const { data: emailsData, error: emailsError } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (mounted && !emailsError) {
        setEmails((emailsData ?? []) as Email[])
      }

      try {
        const { data: settingsData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'developer_mode_mail')
          .maybeSingle()
        if (mounted && settingsData?.value === true) {
          setDeveloperModeMail(true)
        }
      } catch {
        if (mounted) setDeveloperModeMail(false)
      }
      if (mounted) setLoading(false)
    }
    init()
    return () => { mounted = false }
  }, [user?.id])

  const handleSelectEmail = useCallback((email: Email) => {
    setSelectedEmail(email)
    setDraft('')
    setReplyError(null)
  }, [])

  const handleGenerateReply = useCallback(async () => {
    if (!selectedEmail) return
    setReplyError(null)
    setReplyLoading(true)
    try {
      const res = await fetch(AI_HUB_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'generate_reply',
          original_email: selectedEmail.body,
          context: {
            subject: selectedEmail.subject,
            sender: selectedEmail.sender,
          },
        }),
      })
      if (!res.ok) {
        setReplyError(`Webhook antwoordde met ${res.status}.`)
        return
      }
      const json = (await res.json()) as { draft?: string }
      const draftText = json?.draft
      if (typeof draftText !== 'string' || !draftText.trim()) {
        setReplyError('Geen draft in antwoord.')
        return
      }
      setDraft(draftText.trim())
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Fout bij ophalen antwoord.')
    } finally {
      setReplyLoading(false)
    }
  }, [selectedEmail])

  const handleCopyDraft = useCallback(() => {
    if (!draft.trim()) return
    navigator.clipboard.writeText(draft)
    toast('Gekopieerd naar klembord.')
  }, [draft, toast])

  const isLocked = developerModeMail && role !== 'ADMIN'

  if (!authChecked || !user || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-8 w-48 rounded-xl bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-32 rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      {isLocked && (
        <div className="shrink-0 bg-amber-100 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-center text-sm text-amber-800 dark:text-amber-200">
          Developer mode actief: inbox-interactie uitgeschakeld voor andere gebruikers.
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-1/3 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col min-w-0">
          <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Inbox</h1>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <svg className="animate-spin h-8 w-8 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <InboxList
              emails={emails}
              selectedId={selectedEmail?.id ?? null}
              onSelectEmail={handleSelectEmail}
              disabled={isLocked}
            />
          )}
        </aside>
        <main className="w-2/3 p-6 overflow-hidden bg-white dark:bg-slate-800 flex flex-col min-w-0">
          <EmailDetail
            email={selectedEmail}
            draft={draft}
            onDraftChange={setDraft}
            onGenerateReply={handleGenerateReply}
            replyLoading={replyLoading}
            replyError={replyError}
            onCopyDraft={handleCopyDraft}
            disabled={isLocked}
          />
        </main>
      </div>
    </div>
  )
}
