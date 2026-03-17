'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface MonthRow {
  month: string
  total: number
  fede: number
  meli: number
  shared: number
  count: number
}

export default function HistorialPage() {
  const router = useRouter()
  const [rows, setRows] = useState<MonthRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/transactions?all=1')
      .then(r => r.json())
      .then((data: any[]) => {
        const map = new Map<string, MonthRow>()
        for (const t of data) {
          if (!t.include || t.assignment === 'ignorar') continue
          if (!map.has(t.month)) {
            map.set(t.month, { month: t.month, total: 0, fede: 0, meli: 0, shared: 0, count: 0 })
          }
          const row = map.get(t.month)!
          row.count++
          const ars = t.amount_ars || 0
          if (t.assignment === 'fede') row.fede += ars
          else if (t.assignment === 'meli') row.meli += ars
          else if (t.assignment === 'ambos') row.shared += ars
          row.total += ars
        }
        const sorted = Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month))
        setRows(sorted)
        setLoading(false)
      })
  }, [])

  const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Cargando historial...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historial</h1>
            <p className="text-gray-500 text-sm">{rows.length} meses procesados</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/importar')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Importar CSV
            </button>
            <button onClick={() => router.push('/comparar')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Comparar meses
            </button>
            <button onClick={() => router.push('/cuotas')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cuotas pendientes
            </button>
            <button onClick={() => router.push('/')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              ← Inicio
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Mes</th>
                <th className="px-5 py-3 text-right font-medium text-gray-600">Total ARS</th>
                <th className="px-5 py-3 text-right font-medium text-green-700">Fede</th>
                <th className="px-5 py-3 text-right font-medium text-purple-700">Meli</th>
                <th className="px-5 py-3 text-right font-medium text-blue-700">Compartido</th>
                <th className="px-5 py-3 text-center font-medium text-gray-600">Transacciones</th>
                <th className="px-5 py-3 text-center font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => (
                <tr key={row.month} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 font-semibold text-gray-900">{row.month}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">{fmt(row.total)}</td>
                  <td className="px-5 py-3 text-right text-green-700">{fmt(row.fede + row.shared / 2)}</td>
                  <td className="px-5 py-3 text-right text-purple-700">{fmt(row.meli + row.shared / 2)}</td>
                  <td className="px-5 py-3 text-right text-blue-700">{fmt(row.shared)}</td>
                  <td className="px-5 py-3 text-center text-gray-500">{row.count}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => router.push(`/revision?month=${row.month}`)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Revisión
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => router.push(`/resumen?month=${row.month}`)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Resumen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="text-center text-gray-400 py-12">No hay meses procesados aún.</p>
          )}
        </div>
      </div>
    </main>
  )
}
