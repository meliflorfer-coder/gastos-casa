import { NextRequest, NextResponse } from 'next/server'
import { extractText } from 'unpdf'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const card = formData.get('card') as string
    const month = formData.get('month') as string

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    console.log(`Procesando: ${file.name} (${file.size} bytes)`)

    const bytes = await file.arrayBuffer()

    // Extraer texto del PDF
    let pdfText = ''
    try {
      const { text } = await extractText(new Uint8Array(bytes), { mergePages: true })
      pdfText = text
      console.log(`Texto extraído: ${pdfText.length} caracteres`)
    } catch (pdfErr) {
      console.error('Error extrayendo texto del PDF:', pdfErr)
      return NextResponse.json({ error: 'No se pudo leer el PDF' }, { status: 400 })
    }

    if (!pdfText || pdfText.trim().length < 50) {
      return NextResponse.json({ error: 'El PDF no tiene texto legible' }, { status: 400 })
    }

    const prompt = `Analizá este texto de un resumen de tarjeta de crédito o cuenta bancaria argentina.
Extraé TODAS las transacciones/movimientos y devolvé un JSON array con este formato exacto:

[
  {
    "date": "2026-01-15",
    "description": "COTO ONCE",
    "amount_ars": 27654.00,
    "amount_usd": 0,
    "installment_number": null,
    "installment_total": null
  }
]

Reglas:
- date: formato YYYY-MM-DD. Si no tiene año, inferilo del contexto del resumen.
- Si el gasto es en USD, poné 0 en amount_ars y el valor en amount_usd
- Si tiene cuotas (ej: "3/6" o "cuota 3 de 6"), poné installment_number: 3 y installment_total: 6
- Si no tiene cuotas, poné null en ambos campos
- amount_ars y amount_usd son números sin símbolos ni puntos de miles (usar punto decimal)
- NO incluyas totales, pagos previos, ni líneas de resumen — solo compras/consumos individuales
- Devolvé SOLO el JSON array, sin texto adicional ni explicaciones

Texto del resumen:
${pdfText.substring(0, 15000)}`

    console.log('Llamando a Gemini REST API...')
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    })

    console.log(`Gemini status: ${response.status}`)

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini error:', errText)
      return NextResponse.json({ error: `Gemini error ${response.status}: ${errText}` }, { status: 500 })
    }

    const geminiData = await response.json()
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    console.log(`Respuesta Gemini (primeros 300 chars): ${text.substring(0, 300)}`)

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('Error parseando JSON:', cleaned.substring(0, 500))
      return NextResponse.json({ error: 'Gemini no devolvió JSON válido' }, { status: 500 })
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Respuesta inesperada de Gemini' }, { status: 500 })
    }

    const transactions = parsed.map((t: any) => ({
      ...t,
      card,
      month,
      source_file: file.name,
      fx_rate: 0,
      assignment: 'ambos',
      has_iva: false,
      include: true,
    }))

    console.log(`Transacciones extraídas: ${transactions.length}`)
    return NextResponse.json({ transactions })

  } catch (error: any) {
    console.error('Error general:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
