import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const allMonths = searchParams.get('all')

  if (allMonths) {
    // Supabase anon key is capped at 1000 rows — paginate to get all
    const all: any[] = []
    const pageSize = 1000
    let offset = 0
    while (true) {
      const { data, error } = await supabase
        .from('transactions')
        .select('month, assignment, amount_ars, amount_usd, include, card')
        .order('month', { ascending: true })
        .range(offset, offset + pageSize - 1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data?.length) break
      all.push(...data)
      if (data.length < pageSize) break
      offset += pageSize
    }
    return NextResponse.json(all)
  }

  const query = supabase.from('transactions').select('*').order('date', { ascending: true })
  if (month) query.eq('month', month)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { transactions } = body

  const { data, error } = await supabase.from('transactions').insert(transactions).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body

  const { data, error } = await supabase.from('transactions').update(updates).eq('id', id).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const id = searchParams.get('id')

  if (id) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (!month) return NextResponse.json({ error: 'month or id required' }, { status: 400 })
  const { error } = await supabase.from('transactions').delete().eq('month', month)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
