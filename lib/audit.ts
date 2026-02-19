/**
 * Client-side audit logging. Sends events to POST /api/audit.
 * Server-side can use supabase directly with actor_user_id from auth.
 */

export type LogActivityParams = {
  action: string
  entity_type?: string
  entity_id?: string
  metadata?: Record<string, unknown>
}

const API_AUDIT = '/api/audit'

/**
 * Log an activity from the client. Calls POST /api/audit (server sets actor_user_id from auth).
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const res = await fetch(API_AUDIT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: params.action,
        entity_type: params.entity_type ?? null,
        entity_id: params.entity_id ?? null,
        metadata: params.metadata ?? {},
      }),
    })
    if (!res.ok) {
      console.warn('[audit] logActivity failed:', res.status)
    }
  } catch (e) {
    console.warn('[audit] logActivity error:', e)
  }
}
