import { NextResponse } from 'next/server'

/**
 * Runtime config for the client. Used when layout script has no env (e.g. Railway build without NEXT_PUBLIC_* at build time).
 * Only exposes public Supabase URL and anon key.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return NextResponse.json({ nextPublicSupabaseUrl: url, nextPublicSupabaseAnonKey: key })
}
