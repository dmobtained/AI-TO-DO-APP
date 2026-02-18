import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteParams = {
  params: {
    jobId: string;
  };
};

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { jobId } = params;

  if (!jobId) {
    return NextResponse.json(
      { error: 'jobId is verplicht.' },
      { status: 400 }
    );
  }

  try {
    const job = await prisma.webhookJob.findUnique({
      where: { jobId },
      include: {
        ingestion: {
          include: {
            summary: true,
            tasks: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job niet gevonden.' },
        { status: 404 }
      );
    }

    const { ingestion } = job;

    return NextResponse.json({
      jobId: job.jobId,
      status: job.status,
      attempts: job.attempts,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      ingestion: {
        id: ingestion.id,
        status: ingestion.status,
        rawText: ingestion.rawText,
        createdAt: ingestion.createdAt
      },
      summary: ingestion.summary
        ? {
            id: ingestion.summary.id,
            summaryText: ingestion.summary.summaryText,
            copyText: ingestion.summary.copyText
          }
        : null,
      tasks: ingestion.tasks.map((t) => ({
        id: t.id,
        ingestionId: t.ingestionId,
        title: t.title,
        details: t.details,
        priority: t.priority,
        dueDate: t.dueDate,
        tags: t.tags,
        status: t.status,
        externalId: t.externalId,
        order: t.order,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      }))
    });
  } catch (error) {
    console.error('Fout in /api/jobs/[jobId]:', error);
    return NextResponse.json(
      { error: 'Interne serverfout.' },
      { status: 500 }
    );
  }
}

