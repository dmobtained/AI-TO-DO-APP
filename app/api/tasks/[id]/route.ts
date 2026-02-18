import { NextRequest, NextResponse } from 'next/server';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

type RouteParams = {
  params: {
    id: string;
  };
};

type UpdateTaskBody = {
  title?: string;
  details?: string | null;
  priority?: keyof typeof TaskPriority;
  dueDate?: string | null;
  tags?: string[];
  status?: keyof typeof TaskStatus;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: 'Taak-id is verplicht.' },
      { status: 400 }
    );
  }

  let body: UpdateTaskBody;

  try {
    body = (await req.json()) as UpdateTaskBody;
  } catch {
    return NextResponse.json(
      { error: 'Ongeldige JSON payload.' },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};

  if (typeof body.title === 'string') data.title = body.title;
  if (typeof body.details === 'string' || body.details === null)
    data.details = body.details;

  if (body.priority) {
    if (body.priority in TaskPriority) {
      data.priority = TaskPriority[body.priority as keyof typeof TaskPriority];
    } else {
      return NextResponse.json(
        { error: 'Ongeldige priority-waarde.' },
        { status: 400 }
      );
    }
  }

  if (body.dueDate !== undefined) {
    data.dueDate =
      body.dueDate === null || body.dueDate === ''
        ? null
        : new Date(body.dueDate);
  }

  if (Array.isArray(body.tags)) {
    data.tags = body.tags;
  }

  if (body.status) {
    if (body.status in TaskStatus) {
      data.status = TaskStatus[body.status as keyof typeof TaskStatus];
    } else {
      return NextResponse.json(
        { error: 'Ongeldige status-waarde.' },
        { status: 400 }
      );
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'Geen velden om bij te werken.' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updated = await prisma.task.updateMany({
      where: { id, userId: user.id },
      data
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: 'Taak niet gevonden of geen toegang.' },
        { status: 404 }
      );
    }

    const task = await prisma.task.findUnique({ where: { id } });
    return NextResponse.json(task);
  } catch (error) {
    console.error('Fout in PATCH /api/tasks/[id]:', error);
    return NextResponse.json(
      { error: 'Interne serverfout of taak niet gevonden.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: 'Taak-id is verplicht.' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await prisma.task.deleteMany({
      where: { id, userId: user.id }
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Taak niet gevonden of geen toegang.' },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Fout in DELETE /api/tasks/[id]:', error);
    return NextResponse.json(
      { error: 'Interne serverfout of taak niet gevonden.' },
      { status: 500 }
    );
  }
}

