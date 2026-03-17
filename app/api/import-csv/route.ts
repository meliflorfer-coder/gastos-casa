import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

function parseARS(val: string): number {
  if (!val) return 0
  const cleaned = val.replace(/[$\s"]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : Math.abs(n)
}

function parseUSD(val: string): number {
  if (!val) return 0
  const cleaned = val.replace(/[$\s"]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : Math.abs(n)
}

function parseInstallment(val: string): { number: number | null; total: number | null } {
  if (!val) return { number: null, total: null }
  const match = val.match(/(\d+)\/(\d+)/)
  if (!match) return { number: null, total: null }
  return { number: parseInt(match[1]), total: parseInt(match[2]) }
}

function mapCard(owner: string): string {
  const o = owner.toLowerCase()
  if (o.includes('hsbc mc') || (o.includes('mc') && o.includes('fede'))) return 'TC MC Galicia Fede'
  if (o.includes('hsbc visa') || (o.includes('visa') && o.includes('fede'))) return 'TC Visa Galicia Fede'
  if (o.includes('debito') && o.includes('fede')) return 'Debito Galicia Fede'
  if (o.includes('amex')) return 'TC Amex Santander Meli'
  if (o.includes('tcmp') || (o.includes('mp') && o.includes('meli'))) return 'TC MP Meli'
  if (o.includes('tc galicia') && o.includes('meli')) return 'TC MX Galicia Meli'
  if (o.includes('tc visa') && o.includes('meli')) return 'TC Visa Galicia Meli'
  if (o.includes('debito') && o.includes('meli')) return 'Debito Galicia Meli'
  if (o.includes('fede')) return 'Gastos manuales'
  if (o.includes('meli')) return 'Gastos manuales'
  return 'Gastos manuales'
}

function mapAssignment(owner: string, description: string): string {
  const d = description.toLowerCase()
  const o = owner.toLowerCase()
  // Descripción explícitamente compartida
  if (d.includes('compartido') || d.includes('ambos')) return 'ambos'
  // Gastos del hogar que suelen ser compartidos
  const shared = ['edesur', 'gas', 'internet', 'iplan', 'seguro depto', 'expensas', 'edesur', 'marcela', 'bianca', 'verdura', 'polleria', 'carrefour', 'coto', 'jumbo', 'carniceria', 'huevos', 'ferro', 'legem', 'farmacity', 'comedor', 'santa brigida', 'juvenil', 'cafe', 'pedidoya', 'smiles', 'abl', 'p milas', 'vicca', 'supremas', 'rustica']
  for (const s of shared) {
    if (d.includes(s)) return 'ambos'
  }
  // Gastos propios
  if (d.includes('fede') && !o.includes('meli')) return 'fede'
  if (d.includes('nafta fede') || d.includes('cabify fede') || d.includes('tapones fede')) return 'fede'
  if (o.includes('fede') && !d.includes('meli')) return 'fede'
  if (o.includes('meli')) return 'meli'
  return 'ambos'
}

const MONTH_MAP: Record<string, string> = {
  enero: '2026-01',
  febrero: '2026-02',
  marzo: '2026-03',
  abril: '2026-04',
  mayo: '2026-05',
  junio: '2026-06',
  julio: '2026-07',
  agosto: '2026-08',
  septiembre: '2026-09',
  octubre: '2026-10',
  noviembre: '2026-11',
  diciembre: '2026-12',
}

const SKIP_DESCRIPTIONS = ['total', 'total iva', 'total fede', 'total meli', 'iva', 'deuda mes', 'total neto', 'propios', 'tarjetas', 'gastos']
const SKIP_OWNERS = ['tarjeta', 'propios', 'gastos']

export async function POST(req: NextRequest) {
  const { csv } = await req.json()
  if (!csv) return NextResponse.json({ error: 'No CSV provided' }, { status: 400 })

  const lines = csv.split('\n')
  const transactions: any[] = []
  let currentMonth = ''

  for (const rawLine of lines) {
    // Parsear CSV básico (sin comillas en la mayoría de los campos)
    const cols = rawLine.split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''))

    // Detectar encabezado de mes en columna 0
    const col0Lower = cols[0].toLowerCase()
    for (const [es, code] of Object.entries(MONTH_MAP)) {
      if (col0Lower.includes(es)) {
        currentMonth = code
        break
      }
    }

    if (!currentMonth) continue

    const owner = cols[1]?.trim()
    const description = cols[2]?.trim()

    if (!owner || !description) continue

    // Saltar filas de totales y secciones
    const descLower = description.toLowerCase()
    const ownerLower = owner.toLowerCase()
    if (SKIP_DESCRIPTIONS.some(s => descLower.startsWith(s))) continue
    if (SKIP_OWNERS.some(s => ownerLower.startsWith(s))) continue

    // Parsear montos
    const amountARS = parseARS(cols[4])
    const amountUSD = parseUSD(cols[5])
    const importeTotal = parseARS(cols[7])

    // Usar importe_total si amount_ars no está en col 4 pero sí en col 7
    const finalARS = amountUSD > 0 ? 0 : (amountARS || importeTotal)

    if (finalARS === 0 && amountUSD === 0) continue

    const inst = parseInstallment(cols[3])

    transactions.push({
      month: currentMonth,
      date: `${currentMonth}-01`,
      description,
      amount_ars: finalARS,
      amount_usd: amountUSD,
      card: mapCard(owner),
      source_file: 'importacion-historica',
      fx_rate: amountUSD > 0 ? parseARS(cols[6]) : 0,
      assignment: mapAssignment(owner, description),
      has_iva: false,
      include: true,
      user_reviewed: true,
      installment_number: inst.number,
      installment_total: inst.total,
    })
  }

  if (transactions.length === 0) {
    return NextResponse.json({ error: 'No se encontraron transacciones en el CSV' }, { status: 400 })
  }

  // Insertar en lotes de 50
  let inserted = 0
  for (let i = 0; i < transactions.length; i += 50) {
    const batch = transactions.slice(i, i + 50)
    const { error } = await supabase.from('transactions').insert(batch)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    inserted += batch.length
  }

  const months = [...new Set(transactions.map(t => t.month))].sort()
  return NextResponse.json({ inserted, months })
}
