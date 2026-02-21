/**
 * Eenmalig: migreer Prisma Task-rijen (met userId) naar public.tasks (Supabase).
 * Draai na 20250301000000_tasks_status_uppercase_external_id.sql.
 *
 * Vereisten: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Run: npx tsx scripts/migrate-prisma-tasks-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Zet NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })

  const tasks = await prisma.task.findMany({
    where: { userId: { not: null } },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  })

  if (tasks.length === 0) {
    console.log('Geen Prisma-taken met userId gevonden. Klaar.')
    await prisma.$disconnect()
    return
  }

  const rows = tasks.map((t) => ({
    user_id: t.userId!,
    title: t.title,
    details: t.details ?? null,
    due_date: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
    priority: t.priority,
    tags: t.tags ?? [],
    status: t.status,
    external_id: t.externalId,
  }))

  const { data, error } = await supabase
    .from('tasks')
    .upsert(rows, { onConflict: 'user_id,external_id' })

  if (error) {
    console.error('Supabase upsert fout:', error.message)
    await prisma.$disconnect()
    process.exit(1)
  }

  console.log(`Succes: ${rows.length} taken geüpsert naar public.tasks.`)
  await prisma.$disconnect()
}

main()
