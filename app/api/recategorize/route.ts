import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const CATEGORY_KEYWORDS: { keywords: string[]; category: string }[] = [
  { keywords: ['carrefour','coto','jumbo','disco','walmart','dia ','hipermercado','supermercado','verduleria','verdura','fruteria','polleria','carniceria','fiambre','huevos','chino','almacen','despensa','super '], category: 'Supermercado' },
  { keywords: ['mcdonalds','burger king','subway','mostaza','kentucky','kfc','pizza','pizzeria','rustica','don zoilo','buen sabor','supremas','la juvenil','patronato','comedor','resto ','restaurant','parrilla','sushi','japonesa','cafeteria','cafe martinez','santa brigida'], category: 'Restaurantes' },
  { keywords: ['pedidoya','rappi','uber eats','delivery','glovo'], category: 'Delivery' },
  { keywords: ['edesur','edenor','metrogas','gas natural','aysa','telecom','personal ','movistar','claro','fibertel','iplan','cablevision','directv','internet','luz ','expensas','abl','arba'], category: 'Servicios' },
  { keywords: ['netflix','spotify','amazon prime','disney','hbo','apple ','youtube','openai','chatgpt','adobe','microsoft','google one','icloud','dropbox'], category: 'Suscripciones' },
  { keywords: ['farmacity','farmacia','drogueria','pami','medicamento','medico','medica','clinica','hospital','laboratorio','dentista','oftalmolog','osde','swiss medical','galeno','sanatorio'], category: 'Salud' },
  { keywords: ['subte','sube','cabify','uber','remis','taxi','colectivo','tren ','bus ','peaje','autopista'], category: 'Transporte' },
  { keywords: ['ypf','shell','axion','puma','nafta','combustible'], category: 'Combustible' },
  { keywords: ['zara','h&m','forever21','falabella','paris ','easy ','ingles','levis','nike','adidas','ropa','calzado','zapatillas','indumentaria','moodhome'], category: 'Ropa' },
  { keywords: ['easy ','sodimac','pintureria','muebles','decoracion','arredo','hogar','ikea','ferro','vicca','campana'], category: 'Hogar' },
  { keywords: ['apple','samsung','lg ','sony','garbarino','fravega','musimundo','compumundo','electronica'], category: 'Electrónica' },
  { keywords: ['cine','teatro','temaiken','parque','evento','entradas','ticketek','gaming'], category: 'Entretenimiento' },
  { keywords: ['universidad','colegio','escuela','instituto','curso','udemy','coursera','capacitacion','libros','libreria'], category: 'Educación' },
  { keywords: ['aeropuerto','aerolinea','latam','american','lufthansa','hotel','airbnb','booking','expedia','despegar','viaje','smiles'], category: 'Viajes' },
  { keywords: ['seguro','sancor seguros','zurich','mapfre','la caja'], category: 'Seguros' },
  { keywords: ['afip','arba','agip','rentas','impuesto','sellado','tasa '], category: 'Impuestos' },
  { keywords: ['alquiler','cochera','depto','expensas'], category: 'Hogar' },
]

function inferCategory(desc: string): string | null {
  const lower = desc.toLowerCase()
  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    if (keywords.some(kw => lower.includes(kw))) return category
  }
  return null
}

export async function POST() {
  // Fetch all transactions without a category
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('id, description')
    .is('category', null)
    .range(0, 99999)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!txs?.length) return NextResponse.json({ updated: 0 })

  // Group by inferred category to batch updates
  const byCategory = new Map<string, string[]>()
  for (const tx of txs) {
    const cat = inferCategory(tx.description || '')
    if (cat) {
      if (!byCategory.has(cat)) byCategory.set(cat, [])
      byCategory.get(cat)!.push(tx.id)
    }
  }

  let updated = 0
  for (const [category, ids] of byCategory) {
    // Update in batches of 500
    for (let i = 0; i < ids.length; i += 500) {
      const batch = ids.slice(i, i + 500)
      const { error: upErr } = await supabase
        .from('transactions')
        .update({ category })
        .in('id', batch)
      if (!upErr) updated += batch.length
    }
  }

  return NextResponse.json({ updated, total: txs.length })
}
