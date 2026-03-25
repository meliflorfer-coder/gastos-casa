import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')

  if (month) {
    const { data, error } = await supabase
      .from('months')
      .select('*')
      .eq('month', month)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabase.from('months').select('*').order('month', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase
    .from('months')
    .upsert(body, { onConflict: 'month' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { month, ...fields } = body
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  if (fields.status === 'closed') {
    fields.closed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('months')
    .upsert({ month, ...fields }, { onConflict: 'month' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
