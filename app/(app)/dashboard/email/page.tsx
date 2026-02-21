"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { useAuth } from '@/context/AuthProvider'
import { useToast } from '@/context/ToastContext'
import { FeatureGuard } from '@/components/FeatureGuard'
import type { Email } from '@/app/(app)/mail/types'
import { InboxList } from '@/app/(app)/mail/components/InboxList'
import { EmailDetail } from '@/app/(app)/mail/components/EmailDetail'
import { PageContainer } from '@/components/ui/PageContainer'

const AI_HUB_WEBHOOK = process.env.NEXT_PUBLIC_N8N_AI_REPLY_WEBHOOK || process.env.N8N_AI_HUB_WEBHOOK || 'https://datadenkt.app.n8n.cloud/webhook/ai-hub'

export default function DashboardEmailPage() {
  const supabase = getSupabaseClient()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [draft, setDraft] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)
  const [developerModeMail, setDeveloperModeMail] = useState(false)
  const { user } = useDashboardUser()
  const { role } = useAuth()
  const toast = useToast()

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
        if (mounted && (settingsData?.value === true || settingsData?.value === 'true')) {
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

  const isLocked = developerModeMail && role !== 'admin'

  return (
    <FeatureGuard feature="email_module">
      <PageContainer>
        <h1 className="text-xl font-semibold text-textPrimary">E-mail</h1>
        <p className="text-sm text-textSecondary mt-0.5">Inbox en AI-antwoord</p>

        {isLocked && (
          <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-400">
            Developer mode actief: inbox-interactie uitgeschakeld voor andere gebruikers.
          </div>
        )}

        <div className="mt-6 flex gap-0 rounded-2xl border border-border bg-card shadow-sm overflow-hidden min-h-[560px]">
          <aside className="w-80 shrink-0 border-r border-border flex flex-col min-w-0 bg-card">
            <div className="shrink-0 px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-textPrimary">Inbox</h2>
            </div>
            {loading ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <svg className="animate-spin h-8 w-8 text-textSecondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
          <main className="flex-1 p-6 overflow-auto flex flex-col min-w-0 bg-white">
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
      </PageContainer>
    </FeatureGuard>
  )
}
