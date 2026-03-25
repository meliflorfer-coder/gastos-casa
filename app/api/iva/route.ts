import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    const prompt = `Analizá esta imagen o documento de una factura, ticket o resumen fiscal argentino.
Extraé el MONTO TOTAL DE IVA del documento y devolvé SOLO un JSON con este formato exacto:

{
  "iva_amount": 12345.67,
  "confidence": "high",
  "notes": "IVA 21% sobre base imponible de..."
}

Reglas:
- iva_amount: el monto total de IVA en ARS (número sin símbolos ni puntos de miles, usar punto decimal)
- confidence: "high" si está claramente indicado, "medium" si es estimado, "low" si no se puede determinar
- notes: breve explicación de cómo se calculó o encontró el IVA
- Si no encontrás IVA, devolvé iva_amount: 0
- Devolvé SOLO el JSON, sin texto adicional`

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } }
          ]
        }],
        generationConfig: { temperature: 0.1 }
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({ error: `Gemini error ${response.status}: ${errText}` }, { status: 500 })
    }

    const geminiData = await response.json()
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'No se pudo extraer el IVA del documento' }, { status: 500 })
    }

    return NextResponse.json(parsed)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
