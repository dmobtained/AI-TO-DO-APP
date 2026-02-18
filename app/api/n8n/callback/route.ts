import { NextRequest, NextResponse } from 'next/server';
import {
  Prisma,
  TaskPriority,
  TaskStatus,
  IngestionStatus,
  WebhookJobStatus
} from '@prisma/client';
import { prisma } from '@/lib/prisma';

type N8nTaskPayload = {
  externalId: string;
  title: string;
  details?: string | null;
  priority: keyof typeof TaskPriority;
  dueDate?: string | null;
  tags?: string[];
  order: number;
};

type N8nCallbackBody = {
  jobId: string;
  ingestionId: string;
  summaryText: string;
  copyText: string;
  tasks: N8nTaskPayload[];
};

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get('x-n8n-callback-secret');
  const expectedSecret = process.env.N8N_CALLBACK_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      {
        error:
          'Server verkeerd geconfigureerd: N8N_CALLBACK_SECRET ontbreekt.'
      },
      { status: 500 }
    );
  }

  if (!secretHeader || secretHeader !== expectedSecret) {
    return NextResponse.json(
      { error: 'Ongeldige of ontbrekende callback secret.' },
      { status: 401 }
    );
  }

  let body: N8nCallbackBody;

  try {
    body = (await req.json()) as N8nCallbackBody;
  } catch {
    return NextResponse.json(
      { error: 'Ongeldige JSON payload.' },
      { status: 400 }
    );
  }

  const { jobId, ingestionId, summaryText, copyText, tasks } = body;

  if (!jobId || !ingestionId || !summaryText || !copyText) {
    return NextResponse.json(
      {
        error:
          'Velden "jobId", "ingestionId", "summaryText" en "copyText" zijn verplicht.'
      },
      { status: 400 }
    );
  }

  try {
    const job = await prisma.webhookJob.findUnique({
      where: { jobId },
      include: { ingestion: true }
    });

    if (!job || job.ingestionId !== ingestionId) {
      return NextResponse.json(
        { error: 'Job of gekoppelde ingestion niet gevonden.' },
        { status: 404 }
      );
    }

    // Idempotente afhandeling: als de job al COMPLETED is, voer upserts uit
    // maar retourneer verder gewoon succes.

    await prisma.$transaction(async (tx) => {
      // Summary upsert (ingestionId is uniek)
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
      });

      if (Array.isArray(tasks)) {
        for (const t of tasks) {
          if (!t.externalId || !t.title || !t.priority) {
            // Sla onvolledige taken stilletjes over om de hele job niet te breken.
            continue;
          }

          let priority: TaskPriority;
          if (t.priority in TaskPriority) {
            priority = TaskPriority[t.priority as keyof typeof TaskPriority];
          } else {
            // Fallback om Prisma-validatiefouten te voorkomen.
            priority = TaskPriority.MEDIUM;
          }

          const dueDate =
            t.dueDate && t.dueDate !== 'null'
              ? new Date(t.dueDate)
              : null;

          const tags = Array.isArray(t.tags) ? t.tags : [];

          await tx.task.upsert({
            where: { externalId: t.externalId },
            create: {
              ingestionId,
              externalId: t.externalId,
              title: t.title,
              details: t.details ?? null,
              priority,
              dueDate,
              tags,
              order: t.order,
              userId: job.ingestion.userId ?? undefined
            },
            update: {
              title: t.title,
              details: t.details ?? null,
              priority,
              dueDate,
              tags,
              order: t.order,
              userId: job.ingestion.userId ?? undefined
            }
          });
        }
      }

      await tx.ingestion.update({
        where: { id: ingestionId },
        data: { status: IngestionStatus.COMPLETED }
      });

      await tx.webhookJob.update({
        where: { jobId },
        data: {
          status: WebhookJobStatus.COMPLETED,
          attempts: { increment: 1 }
        }
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Fout in /api/n8n/callback:', error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      // Unieke constraint (bijv. externalId) - beschouw dit als succesvol
      // voor idempotente callbacks.
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: 'Interne serverfout.' },
      { status: 500 }
    );
  }
}

