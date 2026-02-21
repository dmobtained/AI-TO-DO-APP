import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MODULE_KEYS, MODULE_LABELS, type ModuleRow } from '@/lib/moduleLockConfig'
import { PageContainer } from '@/components/ui/PageContainer'
import { AdminModulesClient } from './AdminModulesClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminModulesPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    redirect('/dashboard')
  }
  const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin_user')
  if (rpcError || !isAdmin) {
    redirect('/dashboard')
  }

  const { data: locks, error: fetchError } = await supabase
    .from('module_locks')
    .select('module_key, is_locked, reason, locked_by, updated_at')

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  const byKey: Record<string, { is_locked: boolean; reason: string | null; locked_by: string | null; updated_at: string | null }> = {}
  for (const row of locks ?? []) {
    const r = row as { module_key?: string; is_locked?: boolean; reason?: string | null; locked_by?: string | null; updated_at?: string | null }
    if (r.module_key) byKey[r.module_key] = { is_locked: r.is_locked ?? false, reason: r.reason ?? null, locked_by: r.locked_by ?? null, updated_at: r.updated_at ?? null }
  }
  const modules: ModuleRow[] = MODULE_KEYS.map((key) => ({
    module_key: key,
    label: MODULE_LABELS[key] ?? key,
    is_locked: byKey[key]?.is_locked ?? false,
    reason: byKey[key]?.reason ?? null,
    locked_by: byKey[key]?.locked_by ?? null,
    updated_at: byKey[key]?.updated_at ?? null,
  }))

  return (
    <PageContainer>
      <AdminModulesClient initialModules={modules} />
    </PageContainer>
  )
}
