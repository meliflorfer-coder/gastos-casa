'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Transaction } from '@/lib/types'

interface InstallmentGroup {
  description: string
  card: string
  assignment: string
  amount_ars: number
  installment_total: number
  paid: number[]      // cuotas ya registradas
  months: string[]    // meses en que aparece
}

export default function CuotasPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<InstallmentGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/transactions?all=1')
      .then(r => r.json())
      .then((data: Transaction[]) => {
        // Solo transacciones con cuotas
        const withInstallments = data.filter(t => t.installment_number && t.installment_total)

        // Agrupar por descripción normalizada + total de cuotas
        const map = new Map<string, InstallmentGroup>()
        for (const t of withInstallments) {
          const key = `${t.description?.trim().toUpperCase()}|${t.installment_total}`
          if (!map.has(key)) {
            map.set(key, {
              description: t.description,
              card: t.card,
              assignment: t.assignment,
              amount_ars: t.amount_ars,
              installment_total: t.installment_total!,
              paid: [],
              months: [],
            })
          }
          const g = map.get(key)!
          if (!g.paid.includes(t.installment_number!)) {
            g.paid.push(t.installment_number!)
          }
          if (!g.months.includes(t.month)) {
            g.months.push(t.month)
          }
        }

        // Solo los que tienen cuotas pendientes
        const pending = Array.from(map.values())
          .filter(g => Math.max(...g.paid) < g.installment_total)
          .sort((a, b) => {
            const pendA = a.installment_total - Math.max(...a.paid)
            const pendB = b.installment_total - Math.max(...b.paid)
            return pendB - pendA
          })

        setGroups(pending)
        setLoading(false)
      })
  }, [])

  const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

  const assignColor: Record<string, string> = {
    ambos: 'bg-blue-100 text-blue-800',
    fede: 'bg-green-100 text-green-800',
    meli: 'bg-purple-100 text-purple-800',
    ignorar: 'bg-gray-100 text-gray-500',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Calculando cuotas...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cuotas pendientes</h1>
            <p className="text-gray-500 text-sm">{groups.length} planes con cuotas por vencer</p>
          </div>
          <button onClick={() => router.push('/historial')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
            ← Historial
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
            <p className="text-gray-400">No hay cuotas pendientes detectadas.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Descripción</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Tarjeta</th>
                  <th className="px-5 py-3 text-center font-medium text-gray-600">Progreso</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-600">Por cuota</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-600">Restante total</th>
                  <th className="px-5 py-3 text-center font-medium text-gray-600">Asignación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groups.map((g, i) => {
                  const lastPaid = Math.max(...g.paid)
                  const remaining = g.installment_total - lastPaid
                  const totalRemaining = remaining * g.amount_ars
                  const pct = Math.round((lastPaid / g.installment_total) * 100)
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-xs">{g.description}</p>
                        <p className="text-xs text-gray-400">{g.months.sort().join(', ')}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{g.card}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-gray-600">{lastPaid}/{g.installment_total}</span>
                          <div className="w-24 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{remaining} restante{remaining !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">{fmt(g.amount_ars)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmt(totalRemaining)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${assignColor[g.assignment] || 'bg-gray-100 text-gray-600'}`}>
                          {g.assignment}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
