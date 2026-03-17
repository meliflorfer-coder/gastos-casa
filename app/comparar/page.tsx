'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface MonthData {
  month: string
  fede: number
  meli: number
  shared: number
  total: number
  byCategory: Record<string, number>
}

export default function CompararPage() {
  const router = useRouter()
  const [allData, setAllData] = useState<MonthData[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/transactions?all=1')
      .then(r => r.json())
      .then((data: any[]) => {
        const map = new Map<string, MonthData>()
        for (const t of data) {
          if (!t.include || t.assignment === 'ignorar') continue
          if (!map.has(t.month)) {
            map.set(t.month, { month: t.month, fede: 0, meli: 0, shared: 0, total: 0, byCategory: {} })
          }
          const m = map.get(t.month)!
          const ars = t.amount_ars || 0
          if (t.assignment === 'fede') m.fede += ars
          else if (t.assignment === 'meli') m.meli += ars
          else if (t.assignment === 'ambos') m.shared += ars
          m.total += ars
          if (t.category) {
            m.byCategory[t.category] = (m.byCategory[t.category] || 0) + ars
          }
        }
        const sorted = Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month))
        setAllData(sorted)
        // Pre-seleccionar los últimos 3 meses
        setSelected(sorted.slice(0, 3).map(m => m.month))
        setLoading(false)
      })
  }, [])

  const toggleMonth = (month: string) => {
    setSelected(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    )
  }

  const compared = allData.filter(m => selected.includes(m.month)).sort((a, b) => a.month.localeCompare(b.month))

  // Categorías que aparecen en los meses seleccionados
  const allCategories = Array.from(
    new Set(compared.flatMap(m => Object.keys(m.byCategory)))
  ).sort()

  const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

  const maxTotal = Math.max(...compared.map(m => m.total), 1)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Cargando datos...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comparar meses</h1>
            <p className="text-gray-500 text-sm">Seleccioná los meses a comparar</p>
          </div>
          <button onClick={() => router.push('/historial')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
            ← Historial
          </button>
        </div>

        {/* Selector de meses */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6 flex flex-wrap gap-2">
          {allData.map(m => (
            <button
              key={m.month}
              onClick={() => toggleMonth(m.month)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                selected.includes(m.month)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m.month}
            </button>
          ))}
          {allData.length === 0 && <p className="text-gray-400 text-sm">No hay meses procesados aún.</p>}
        </div>

        {compared.length > 0 && (
          <>
            {/* Barras visuales */}
            <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
              <h2 className="font-semibold text-gray-800 mb-4">Total ARS por mes</h2>
              <div className="space-y-3">
                {compared.map(m => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-20 shrink-0">{m.month}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${(m.total / maxTotal) * 100}%` }}
                      >
                        <span className="text-xs text-white font-medium whitespace-nowrap">{fmt(m.total)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabla comparativa */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-5">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Concepto</th>
                    {compared.map(m => (
                      <th key={m.month} className="px-5 py-3 text-right font-medium text-gray-600">{m.month}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="bg-green-50">
                    <td className="px-5 py-2.5 text-green-800 font-medium">Fede paga</td>
                    {compared.map(m => (
                      <td key={m.month} className="px-5 py-2.5 text-right text-green-800 font-semibold">{fmt(m.fede + m.shared / 2)}</td>
                    ))}
                  </tr>
                  <tr className="bg-purple-50">
                    <td className="px-5 py-2.5 text-purple-800 font-medium">Meli paga</td>
                    {compared.map(m => (
                      <td key={m.month} className="px-5 py-2.5 text-right text-purple-800 font-semibold">{fmt(m.meli + m.shared / 2)}</td>
                    ))}
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="px-5 py-2.5 text-blue-800 font-medium">Compartido</td>
                    {compared.map(m => (
                      <td key={m.month} className="px-5 py-2.5 text-right text-blue-800">{fmt(m.shared)}</td>
                    ))}
                  </tr>
                  <tr className="border-t-2 border-gray-200 font-semibold">
                    <td className="px-5 py-2.5 text-gray-900">Total ARS</td>
                    {compared.map(m => (
                      <td key={m.month} className="px-5 py-2.5 text-right text-gray-900">{fmt(m.total)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Por categoría */}
            {allCategories.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b">
                  <h2 className="font-semibold text-gray-800">Por categoría</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium text-gray-600">Categoría</th>
                      {compared.map(m => (
                        <th key={m.month} className="px-5 py-3 text-right font-medium text-gray-600">{m.month}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allCategories.map(cat => (
                      <tr key={cat} className="hover:bg-gray-50">
                        <td className="px-5 py-2.5 text-gray-700">{cat}</td>
                        {compared.map(m => (
                          <td key={m.month} className="px-5 py-2.5 text-right text-gray-600">
                            {m.byCategory[cat] ? fmt(m.byCategory[cat]) : <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {compared.length === 0 && allData.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
            <p className="text-gray-400">Seleccioná al menos un mes para comparar.</p>
          </div>
        )}
      </div>
    </main>
  )
}
