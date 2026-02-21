export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const WEBHOOK_TIMEOUT_MS = 15000

type DaynoteTaskPayload = {
  title: string
  status: string
  date: string | null
}

type DaynoteResponse = { note?: string }

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const webhookUrl = process.env.N8N_AI_HUB_WEBHOOK ?? process.env.NEXT_PUBLIC_N8N_AI_HUB_WEBHOOK
    if (!webhookUrl?.trim()) {
      return NextResponse.json(
        { error: 'AI Hub-webhook is niet geconfigureerd. Stel N8N_AI_HUB_WEBHOOK in.' },
        { status: 503 }
      )
    }

    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, details, priority, due_date, status')
      .eq('user_id', user.id)
      .eq('status', 'OPEN')

    if (tasksError) {
      return NextResponse.json({ error: tasksError.message }, { status: 500 })
    }

    const tasks = (tasksData ?? []) as { title: string; status: string; due_date: string | null }[]

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'Geen open taken.' }, { status: 400 })
    }

    const payload = {
      type: 'daynote',
      user_id: user.id,
      tasks: tasks.map((t): DaynoteTaskPayload => ({
        title: t.title,
        status: t.status,
        date: t.due_date ?? null,
      })),
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)

    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId))

    if (!res.ok) {
      return NextResponse.json(
        { error: `Webhook antwoordde met ${res.status}.` },
        { status: 502 }
      )
    }

    let json: DaynoteResponse
    try {
      json = (await res.json()) as DaynoteResponse
    } catch {
      return NextResponse.json(
        { error: 'Ongeldige JSON in antwoord van AI Hub.' },
        { status: 502 }
      )
    }

    const note = json?.note
    if (typeof note !== 'string' || note.length <= 20) {
      return NextResponse.json(
        { error: 'Ongeldige of te korte notitie van de webhook.' },
        { status: 502 }
      )
    }

    const { error: insertError } = await supabase.from('ai_notes').insert({
      user_id: user.id,
      note,
      created_at: new Date().toISOString(),
    })
    if (insertError) {
      return NextResponse.json(
        { error: `Notitie kon niet worden opgeslagen: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ note })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Er is iets misgegaan.'
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Verzoek time-out (15 s).' }, { status: 504 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
