import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { createBrowserClient } from "@supabase/ssr"

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

function createSupabaseClient(url: string, key: string): SupabaseClient {
  if (typeof window !== "undefined") {
    return createBrowserClient(url, key)
  }
  return createClient(url, key)
}

export function getSupabaseClient(): SupabaseClient {
  const env = getSupabaseEnv()
  const wantUrl = env?.url && env?.key ? env.url : PLACEHOLDER_URL
  const wantKey = env?.url && env?.key ? env.key : PLACEHOLDER_KEY
  if (_client !== null && _clientUrl === PLACEHOLDER_URL && env?.url && env?.key) {
    _client = createSupabaseClient(env.url, env.key)
    _clientUrl = env.url
    return _client
  }
  if (_client !== null && _clientUrl === wantUrl) return _client
  if (wantUrl === PLACEHOLDER_URL && typeof console !== 'undefined') {
    console.warn(
      '[Supabase] NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreken of zijn niet geladen. Data wordt niet opgeslagen. Zet .env.local en herstart de dev server.'
    )
  }
  _client = createSupabaseClient(wantUrl, wantKey)
  _clientUrl = wantUrl
  return _client
}

/** Reset cached client so next getSupabaseClient() uses current env (e.g. after loading config from API). */
export function resetSupabaseClient(): void {
  _client = null
  _clientUrl = null
}
