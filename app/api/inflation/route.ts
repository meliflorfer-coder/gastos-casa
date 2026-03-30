import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion', {
      next: { revalidate: 86400 }, // cache 24hs
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    // data: [{ fecha: "2024-01-31", valor: 20.6 }, ...]
    // Normalizar a formato YYYY-MM y valor como decimal (20.6 → 0.206)
    const rates: Record<string, number> = {}
    for (const item of data) {
      const month = item.fecha?.slice(0, 7) // "2024-01"
      if (month) rates[month] = (item.valor ?? 0) / 100
    }
    return NextResponse.json(rates)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
