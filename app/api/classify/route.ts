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

// Mapeo de palabras clave → categoría (aplicado cuando no hay historial)
const CATEGORY_KEYWORDS: { keywords: string[]; category: string }[] = [
  { keywords: ['carrefour','coto','jumbo','disco','walmart','dia ','hipermercado','supermercado','verduleria','verdura','fruteria','polleria','carniceria','fiambre','huevos','chino','almacen','despensa','super '], category: 'Supermercado' },
  { keywords: ['mcdonalds','burger king','subway','mostaza','kentucky','kfc','pizza','pizzeria','rustica','don zoilo','buen sabor','supremas','la juvenil','patronato','comedor','resto ','restaurant','parrilla','sushi','japonesa','cafeteria','cafe martinez','santa brigida'], category: 'Restaurantes' },
  { keywords: ['pedidoya','rappi','uber eats','delivery','glovo'], category: 'Delivery' },
  { keywords: ['edesur','edenor','metrogas','gas natural','aysa','telecom','personal ','movistar','claro','fibertel','iplan','cablevision','directv','internet','luz ','expensas','abl','arba'], category: 'Servicios' },
  { keywords: ['netflix','spotify','amazon prime','disney','hbo','apple ','youtube','openai','chatgpt','adobe','microsoft','google one','icloud','dropbox'], category: 'Suscripciones' },
  { keywords: ['farmacity','farmacia','drogueria','pami','medicamento','medico','medica','clinica','hospital','laboratorio','dentista','oftalmolog','osde','swiss medical','galeno','sanatorio'], category: 'Salud' },
  { keywords: ['farmacity','farmacia'], category: 'Farmacia' },
  { keywords: ['subte','sube','cabify','uber','remis','taxi','colectivo','tren ','bus ','peaje','autopista'], category: 'Transporte' },
  { keywords: ['ypf','shell','axion','puma','nafta','combustible'], category: 'Combustible' },
  { keywords: ['zara','h&m','forever21','falabella','paris ','easy ','ingles','levis','nike','adidas','ropa','calzado','zapatillas','indumentaria','moodhome'], category: 'Ropa' },
  { keywords: ['easy ','sodimac','arciel','pinchos','pintureria','muebles','decoracion','arredo','hogar','ikea','ferro','vicca','campana'], category: 'Hogar' },
  { keywords: ['apple','samsung','lg ','sony','garbarino','fravega','musimundo','compumundo','electronica'], category: 'Electrónica' },
  { keywords: ['cine','teatro','temaiken','parque','evento','entradas','ticketek','whatsapp','gaming'], category: 'Entretenimiento' },
  { keywords: ['universidad','colegio','escuela','instituto','curso','udemy','coursera','capacitacion','libros','libreria'], category: 'Educación' },
  { keywords: ['aeropuerto','aerolinea','latam','american','lufthansa','hotel','airbnb','booking','expedia','despegar','viaje','smiles'], category: 'Viajes' },
  { keywords: ['seguro','sancor seguros','zurich','mapfre','la caja','seguros '], category: 'Seguros' },
  { keywords: ['afip','arba','agip','rentas','impuesto','sellado','tasa '], category: 'Impuestos' },
]

function inferCategory(desc: string): string | null {
  const lower = desc.toLowerCase()
  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    if (keywords.some(kw => lower.includes(kw))) return category
  }
  return null
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
    .select('description, assignment, include, has_iva, category')
    .eq('user_reviewed', true)
    .neq('month', month)
    .order('created_at', { ascending: false })

  if (!reviewed?.length) return NextResponse.json({ classified: 0 })

  // Construir mapa: descripción normalizada → clasificación más reciente
  const classMap = new Map<string, { assignment: string; include: boolean; has_iva: boolean; category?: string }>()
  for (const t of reviewed) {
    const key = normalize(t.description)
    if (!classMap.has(key)) {
      classMap.set(key, { assignment: t.assignment, include: t.include, has_iva: t.has_iva, category: t.category })
    }
  }

  // Aplicar clasificación a las nuevas transacciones
  let classified = 0
  for (const tx of newTxs) {
    const key = normalize(tx.description)
    const match = classMap.get(key)

    if (match) {
      const updatePayload: Record<string, any> = {
        assignment: match.assignment,
        include: match.include,
        has_iva: match.has_iva,
        user_reviewed: false,
      }
      // Categoría: primero del historial, sino inferir por keywords
      const cat = match.category || inferCategory(tx.description)
      if (cat) updatePayload.category = cat
      await supabase.from('transactions').update(updatePayload).eq('id', tx.id)
      classified++
    } else {
      // Sin historial: solo inferir categoría si se puede
      const cat = inferCategory(tx.description)
      if (cat) {
        await supabase.from('transactions').update({ category: cat }).eq('id', tx.id)
      }
    }
  }

  return NextResponse.json({ classified, total: newTxs.length })
}
