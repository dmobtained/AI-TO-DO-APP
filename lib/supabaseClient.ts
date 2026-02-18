import { createClient, SupabaseClient } from "@supabase/supabase-js"

const PLACEHOLDER_URL = "https://placeholder.supabase.co"
const PLACEHOLDER_KEY = "placeholder-anon-key"

export function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return createClient(PLACEHOLDER_URL, PLACEHOLDER_KEY)
  }

  return createClient(url, key)
}
