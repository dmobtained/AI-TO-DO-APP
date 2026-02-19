/**
 * Module Engine – Audit logging.
 * Every write should call logModuleAction after DB write.
 * Server-only: inserts into activity_log (same Supabase client, no /api/audit roundtrip).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type AuditParams = {
  supabase: SupabaseClient
  userId: string
  userEmail: string | null
  module: string
  operation: string
  entityId: string | null
  metadata?: Record<string, unknown>
}

/**
 * Logs action as ${module}.${operation}, entity_type = module, entity_id, metadata.
 */
export async function logModuleAction(params: AuditParams): Promise<void> {
  const {
    supabase,
    userId,
    userEmail,
    module,
    operation,
    entityId,
    metadata = {},
  } = params
  const action = `${module}.${operation}`
  await supabase.from('activity_log').insert({
    actor_user_id: userId,
    actor_email: userEmail,
    action,
    entity_type: module,
    entity_id: entityId,
    metadata,
  })
}
