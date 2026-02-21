export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { Prisma, IngestionStatus, WebhookJobStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const ALLOWED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH']

type N8nTaskPayload = {
  externalId: string
  title: string
  details?: string | null
  priority: string
  dueDate?: string | null
  tags?: string[]
  order: number
}

type N8nCallbackBody = {
  jobId: string
  ingestionId: string
  summaryText: string
  copyText: string
  tasks: N8nTaskPayload[]
}

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get('x-n8n-callback-secret')
  const expectedSecret = process.env.N8N_CALLBACK_SECRET

  if (!expectedSecret) {
    return NextResponse.json(
      {
        error:
          'Server verkeerd geconfigureerd: N8N_CALLBACK_SECRET ontbreekt.'
      },
      { status: 500 }
    )
  }

  if (!secretHeader || secretHeader !== expectedSecret) {
    return NextResponse.json(
      { error: 'Ongeldige of ontbrekende callback secret.' },
      { status: 401 }
    )
  }

  let body: N8nCallbackBody
  try {
    body = (await req.json()) as N8nCallbackBody
  } catch {
    return NextResponse.json(
      { error: 'Ongeldige JSON payload.' },
      { status: 400 }
    )
  }

  const { jobId, ingestionId, summaryText, copyText, tasks } = body

  if (!jobId || !ingestionId || !summaryText || !copyText) {
    return NextResponse.json(
      {
        error:
          'Velden "jobId", "ingestionId", "summaryText" en "copyText" zijn verplicht.'
      },
      { status: 400 }
    )
  }

  try {
    const job = await prisma.webhookJob.findUnique({
      where: { jobId },
      include: { ingestion: true }
    })

    if (!job || job.ingestionId !== ingestionId) {
      return NextResponse.json(
        { error: 'Job of gekoppelde ingestion niet gevonden.' },
        { status: 404 }
      )
    }

    const userId = job.ingestion.userId ?? null

    await prisma.$transaction(async (tx) => {
      await tx.summary.upsert({
        where: { ingestionId },
        create: {
          ingestionId,
          summaryText,
          copyText
        },
        update: {
          summaryText,
          copyText
        }
      })

      await tx.ingestion.update({
        where: { id: ingestionId },
        data: { status: IngestionStatus.COMPLETED }
      })

      await tx.webhookJob.update({
        where: { jobId },
        data: {
          status: WebhookJobStatus.COMPLETED,
          attempts: { increment: 1 }
        }
      })
    })

    // User-facing taken naar public.tasks (Supabase), idempotent via external_id
    if (Array.isArray(tasks) && tasks.length > 0 && userId && supabaseAdmin) {
      const rows: { user_id: string; title: string; details: string | null; due_date: string | null; priority: string; tags: string[]; status: string; external_id: string }[] = []
      for (const t of tasks) {
        if (!t.externalId || !t.title) continue
        const priority = typeof t.priority === 'string' && ALLOWED_PRIORITIES.includes(t.priority)
          ? t.priority
          : 'MEDIUM'
        const dueDate =
          t.dueDate && t.dueDate !== 'null'
            ? (typeof t.dueDate === 'string' ? t.dueDate.slice(0, 10) : new Date(t.dueDate).toISOString().slice(0, 10))
            : null
        const tags = Array.isArray(t.tags) ? t.tags : []
        rows.push({
          user_id: userId,
          title: t.title,
          details: t.details ?? null,
          due_date: dueDate,
          priority,
          tags,
          status: 'OPEN',
          external_id: t.externalId
        })
      }
      if (rows.length > 0) {
        const { error } = await supabaseAdmin
          .from('tasks')
          .upsert(rows, { onConflict: 'user_id,external_id' })
        if (error) {
          console.error('n8n callback: Supabase tasks upsert fout:', error.message)
          // Job is al COMPLETED in Prisma; we log en gaan door
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Fout in /api/n8n/callback:', error)

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json(
      { error: 'Interne serverfout.' },
      { status: 500 }
    )
  }
}
