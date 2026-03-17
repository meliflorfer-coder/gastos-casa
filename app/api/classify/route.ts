import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// Normaliza descripción para matching: elimina sufijo de cuota y espacios
function normalize(desc: string): string {
  return desc
    .toUpperCase()
    .replace(/\s+\d+\/\d+\s*$/, '')  // quita "3/6" al final
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(req: NextRequest) {
  const { month, ids } = await req.json()

  if (!month || !ids?.length) {
    return NextResponse.json({ classified: 0 })
  }

  // Traer las transacciones nuevas del mes
  const { data: newTxs } = await supabase
    .from('transactions')
    .select('*')
    .in('id', ids)

  if (!newTxs?.length) return NextResponse.json({ classified: 0 })

  // Traer todas las transacciones revisadas por el usuario en meses anteriores
  const { data: reviewed } = await supabase
    .from('transactions')
    .select('description, assignment, include, has_iva')
    .eq('user_reviewed', true)
    .neq('month', month)
    .order('created_at', { ascending: false })

  if (!reviewed?.length) return NextResponse.json({ classified: 0 })

  // Construir mapa: descripción normalizada → clasificación más reciente
  const classMap = new Map<string, { assignment: string; include: boolean; has_iva: boolean }>()
  for (const t of reviewed) {
    const key = normalize(t.description)
    if (!classMap.has(key)) {
      classMap.set(key, { assignment: t.assignment, include: t.include, has_iva: t.has_iva })
    }
  }

  // Aplicar clasificación a las nuevas transacciones
  let classified = 0
  for (const tx of newTxs) {
    const key = normalize(tx.description)
    const match = classMap.get(key)
    if (match) {
      await supabase
        .from('transactions')
        .update({
          assignment: match.assignment,
          include: match.include,
          has_iva: match.has_iva,
          user_reviewed: false, // sigue false = auto-clasificado, no revisado manualmente
        })
        .eq('id', tx.id)
      classified++
    }
  }

  return NextResponse.json({ classified, total: newTxs.length })
}
