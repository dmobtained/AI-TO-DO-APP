export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server';
import { Prisma, IngestionStatus, WebhookJobStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

type IngestRequestBody = {
  rawText: string;
  requestId: string;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function serverError(message = 'Interne serverfout') {
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(req: NextRequest) {
  const { N8N_INGEST_WEBHOOK_URL, APP_BASE_URL, N8N_CALLBACK_SECRET } =
    process.env;

  if (!N8N_INGEST_WEBHOOK_URL || !APP_BASE_URL || !N8N_CALLBACK_SECRET) {
    return serverError(
      'Server verkeerd geconfigureerd: controleer N8N_INGEST_WEBHOOK_URL, APP_BASE_URL en N8N_CALLBACK_SECRET.'
    );
  }

  let body: IngestRequestBody;

  try {
    body = (await req.json()) as IngestRequestBody;
  } catch {
    return badRequest('Ongeldige JSON payload.');
  }

  const rawText = body?.rawText?.trim();
  const requestId = body?.requestId?.trim();

  if (!rawText) {
    return badRequest('Veld "rawText" is verplicht.');
  }

  if (!requestId) {
    return badRequest('Veld "requestId" is verplicht voor idempotentie.');
  }

  try {
    let userId: string | undefined;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    } catch {
      // Auth optional for ingest (e.g. external callers)
    }

    // 1) Idempotency: controleer of deze requestId al eerder is verwerkt.
    let ingestion = await prisma.ingestion.findUnique({
      where: { requestId },
      include: { webhookJob: true }
    });

    if (!ingestion) {
      // 2) Nog geen ingestion voor deze requestId: maak er één aan.
      try {
        ingestion = await prisma.ingestion.create({
          data: {
            rawText,
            requestId,
            status: IngestionStatus.PENDING,
            ...(userId && { userId })
          },
          include: { webhookJob: true }
        });
      } catch (error) {
        // Unique constraint race-condition op requestId opvangen
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          ingestion = await prisma.ingestion.findUnique({
            where: { requestId },
            include: { webhookJob: true }
          });
        } else {
          throw error;
        }
      }
    }

    if (!ingestion) {
      return serverError('Kon ingestion niet aanmaken of ophalen.');
    }

    // 3) Zorg dat er een WebhookJob is voor deze ingestion.
    let webhookJob = ingestion.webhookJob;

    if (!webhookJob) {
      const jobId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      webhookJob = await prisma.webhookJob.create({
        data: {
          jobId,
          ingestionId: ingestion.id,
          status: WebhookJobStatus.PENDING,
          attempts: 0
        }
      });
    }

    // 4) Verstuur payload naar n8n webhook.
    const callbackUrl = `${APP_BASE_URL.replace(/\/$/, '')}/api/n8n/callback`;

    const webhookPayload = {
      jobId: webhookJob.jobId,
      ingestionId: ingestion.id,
      requestId: ingestion.requestId,
      rawText: ingestion.rawText,
      callbackUrl,
      callbackSecret: N8N_CALLBACK_SECRET
    };

    let webhookOk = true;

    try {
      const response = await fetch(N8N_INGEST_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });

      webhookOk = response.ok;
    } catch {
      webhookOk = false;
    }

    if (!webhookOk) {
      await prisma.$transaction([
        prisma.webhookJob.update({
          where: { jobId: webhookJob.jobId },
          data: {
            status: WebhookJobStatus.FAILED,
            attempts: { increment: 1 }
          }
        }),
        prisma.ingestion.update({
          where: { id: ingestion.id },
          data: { status: IngestionStatus.FAILED }
        })
      ]);

      return serverError('Kon n8n-webhook niet bereiken.');
    }

    // 5) Markeer job als verstuurd en ingestion als processing.
    const [updatedJob, updatedIngestion] = await prisma.$transaction([
      prisma.webhookJob.update({
        where: { jobId: webhookJob.jobId },
        data: {
          status: WebhookJobStatus.SENT,
          attempts: { increment: 1 }
        }
      }),
      prisma.ingestion.update({
        where: { id: ingestion.id },
        data: { status: IngestionStatus.PROCESSING }
      })
    ]);

    return NextResponse.json(
      {
        jobId: updatedJob.jobId,
        ingestionId: updatedIngestion.id,
        requestId: updatedIngestion.requestId,
        status: updatedIngestion.status
      },
      {
        status: ingestion.createdAt === updatedIngestion.createdAt ? 202 : 200
      }
    );
  } catch (error) {
    console.error('Fout in /api/ingest:', error);
    return serverError();
  }
}

