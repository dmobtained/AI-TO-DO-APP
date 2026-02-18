import { createClient, SupabaseClient } from "@supabase/supabase-js"

const PLACEHOLDER_URL = "https://placeholder.supabase.co"
const PLACEHOLDER_KEY = "placeholder-anon-key"

declare global {
  interface Window {
    __SUPABASE_ENV__?: { url: string; key: string }
  }
}

let _client: SupabaseClient | null = null
let _clientUrl: string | null = null

function getSupabaseEnv(): { url: string; key: string } | null {
  if (typeof window !== "undefined" && window.__SUPABASE_ENV__?.url && window.__SUPABASE_ENV__?.key) {
    return window.__SUPABASE_ENV__
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url && key) return { url, key }
  return null
}

export function getSupabaseClient(): SupabaseClient {
  const env = getSupabaseEnv()
  const wantUrl = env?.url && env?.key ? env.url : PLACEHOLDER_URL
  const wantKey = env?.url && env?.key ? env.key : PLACEHOLDER_KEY
  // Replace client if we now have real env but current client is placeholder
  if (_client !== null && _clientUrl === PLACEHOLDER_URL && env?.url && env?.key) {
    _client = createClient(env.url, env.key)
    _clientUrl = env.url
    return _client
  }
  if (_client !== null && _clientUrl === wantUrl) return _client
  _client = createClient(wantUrl, wantKey)
  _clientUrl = wantUrl
  return _client
}

/** Reset cached client so next getSupabaseClient() uses current env (e.g. after loading config from API). */
export function resetSupabaseClient(): void {
  _client = null
  _clientUrl = null
}
