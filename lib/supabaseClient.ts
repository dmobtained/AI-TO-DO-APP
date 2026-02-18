import { createClient, SupabaseClient } from "@supabase/supabase-js"

const PLACEHOLDER_URL = "https://placeholder.supabase.co"
const PLACEHOLDER_KEY = "placeholder-anon-key"

let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (_client !== null) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    _client = createClient(PLACEHOLDER_URL, PLACEHOLDER_KEY)
  } else {
    _client = createClient(url, key)
  }
  return _client
}
