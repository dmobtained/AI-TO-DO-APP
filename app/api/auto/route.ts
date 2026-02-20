import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as 'fuel' | 'maintenance' | 'repair' | 'purchase' | null

  let q = supabase
    .from('auto_entries')
    .select('id, user_id, type, title, amount, entry_date, notes, odometer_km, liters, created_at')
    .eq('user_id', user.id)
    .order('entry_date', { ascending: false })

  if (type) q = q.eq('type', type)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const type = body.type as string
  const validTypes = ['fuel', 'maintenance', 'repair', 'purchase']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  const title = String(body.title ?? '').trim() || 'Onbenoemd'
  const amount = parseFloat(body.amount)
  const entry_date = body.entry_date as string
  const notes = body.notes != null ? String(body.notes).trim() : null
  const odometer_km = body.odometer_km != null ? parseInt(String(body.odometer_km), 10) : null
  const liters = body.liters != null ? parseFloat(String(body.liters)) : null

  if (Number.isNaN(amount) || amount < 0) {
    return NextResponse.json({ error: 'Ongeldig bedrag' }, { status: 400 })
  }
  if (!entry_date || !/^\d{4}-\d{2}-\d{2}$/.test(entry_date)) {
    return NextResponse.json({ error: 'Ongeldige datum' }, { status: 400 })
  }

  const { data: row, error: insertError } = await supabase
    .from('auto_entries')
    .insert({
      user_id: user.id,
      type,
      title,
      amount,
      entry_date,
      notes: notes || null,
      odometer_km: Number.isNaN(odometer_km) ? null : odometer_km,
      liters: liters != null && !Number.isNaN(liters) ? liters : null,
    })
    .select('id, user_id, type, title, amount, entry_date, notes, odometer_km, liters, created_at')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json({ entry: row })
}
