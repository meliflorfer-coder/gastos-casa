'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Transaction } from '@/lib/types'

function ResumenContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const month = searchParams.get('month') || ''

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [carryover, setCarryover] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!month) return
    fetch(`/api/transactions?month=${month}`)
      .then(r => r.json())
      .then(data => {
        setTransactions(data || [])
        setLoading(false)
      })
  }, [month])

  const included = transactions.filter(t => t.include && t.assignment !== 'ignorar')
  const arsItems = included.filter(t => !t.amount_usd || t.amount_usd === 0)
  const usdItems = included.filter(t => t.amount_usd > 0)

  // Totales en ARS
  const fedeARS = arsItems.filter(t => t.assignment === 'fede').reduce((s, t) => s + t.amount_ars, 0)
  const meliARS = arsItems.filter(t => t.assignment === 'meli').reduce((s, t) => s + t.amount_ars, 0)
  const sharedARS = arsItems.filter(t => t.assignment === 'ambos').reduce((s, t) => s + t.amount_ars, 0)

  // Totales en USD
  const fedeUSD = usdItems.filter(t => t.assignment === 'fede').reduce((s, t) => s + t.amount_usd, 0)
  const meliUSD = usdItems.filter(t => t.assignment === 'meli').reduce((s, t) => s + t.amount_usd, 0)
  const sharedUSD = usdItems.filter(t => t.assignment === 'ambos').reduce((s, t) => s + t.amount_usd, 0)

  const ivaTotal = included.filter(t => t.has_iva).reduce((s, t) => s + t.amount_ars, 0)

  const fedeFinalARS = fedeARS + sharedARS / 2 + carryover / 2
  const meliFinalARS = meliARS + sharedARS / 2 + carryover / 2
  const fedeFinalUSD = fedeUSD + sharedUSD / 2
  const meliFinalUSD = meliUSD + sharedUSD / 2

  const fmtARS = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
  const fmtUSD = (n: number) => `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const exportCSV = () => {
    const headers = ['Fecha', 'Tarjeta', 'Descripción', 'Importe ARS', 'Importe USD', 'Cuota', 'Asignación', 'IVA', 'Incluido']
    const rows = transactions.map(t => [
      t.date,
      t.card,
      t.description,
      t.amount_ars,
      t.amount_usd || '',
      t.installment_number ? `${t.installment_number}/${t.installment_total}` : '',
      t.assignment,
      t.has_iva ? 'SI' : 'NO',
      t.include ? 'SI' : 'NO',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gastos-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const byCard = arsItems.reduce((acc, t) => {
    acc[t.card] = (acc[t.card] || 0) + t.amount_ars
    return acc
  }, {} as Record<string, number>)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Calculando resumen...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resumen — {month}</h1>
            <p className="text-gray-500 text-sm">{included.length} transacciones incluidas</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Exportar CSV
            </button>
            <button
              onClick={() => router.push('/historial')}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Historial
            </button>
            <button
              onClick={() => router.push(`/revision?month=${month}`)}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              ← Revisión
            </button>
          </div>
        </div>

        {/* Deuda mes anterior */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <label className="block text-xs font-medium text-gray-600 mb-1">Deuda mes anterior (ARS)</label>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={carryover}
              onChange={e => setCarryover(Number(e.target.value))}
              className="border rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Totales ARS */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">En pesos (ARS)</h2>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <p className="text-sm font-medium text-green-700 mb-1">Fede paga</p>
            <p className="text-3xl font-bold text-green-900">{fmtARS(fedeFinalARS)}</p>
            <div className="mt-3 space-y-1 text-xs text-green-700">
              <div className="flex justify-between"><span>Propios:</span><span>{fmtARS(fedeARS)}</span></div>
              <div className="flex justify-between"><span>50% compartidos:</span><span>{fmtARS(sharedARS / 2)}</span></div>
              {carryover > 0 && <div className="flex justify-between"><span>50% deuda anterior:</span><span>{fmtARS(carryover / 2)}</span></div>}
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <p className="text-sm font-medium text-purple-700 mb-1">Meli paga</p>
            <p className="text-3xl font-bold text-purple-900">{fmtARS(meliFinalARS)}</p>
            <div className="mt-3 space-y-1 text-xs text-purple-700">
              <div className="flex justify-between"><span>Propios:</span><span>{fmtARS(meliARS)}</span></div>
              <div className="flex justify-between"><span>50% compartidos:</span><span>{fmtARS(sharedARS / 2)}</span></div>
              {carryover > 0 && <div className="flex justify-between"><span>50% deuda anterior:</span><span>{fmtARS(carryover / 2)}</span></div>}
            </div>
          </div>
        </div>

        {/* Totales USD — solo si hay gastos en USD */}
        {(fedeFinalUSD > 0 || meliFinalUSD > 0) && (
          <>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">En dólares (USD)</h2>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-medium text-green-700 mb-1">Fede paga</p>
                <p className="text-2xl font-bold text-green-900">{fmtUSD(fedeFinalUSD)}</p>
                <div className="mt-2 space-y-1 text-xs text-green-700">
                  <div className="flex justify-between"><span>Propios:</span><span>{fmtUSD(fedeUSD)}</span></div>
                  <div className="flex justify-between"><span>50% compartidos:</span><span>{fmtUSD(sharedUSD / 2)}</span></div>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-sm font-medium text-purple-700 mb-1">Meli paga</p>
                <p className="text-2xl font-bold text-purple-900">{fmtUSD(meliFinalUSD)}</p>
                <div className="mt-2 space-y-1 text-xs text-purple-700">
                  <div className="flex justify-between"><span>Propios:</span><span>{fmtUSD(meliUSD)}</span></div>
                  <div className="flex justify-between"><span>50% compartidos:</span><span>{fmtUSD(sharedUSD / 2)}</span></div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Compartidos + IVA */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-700">Total compartido ARS</p>
            <p className="text-xl font-bold text-blue-900 mt-1">{fmtARS(sharedARS)}</p>
            <p className="text-xs text-blue-600">{fmtARS(sharedARS / 2)} c/u</p>
            {sharedUSD > 0 && <p className="text-xs text-blue-600 mt-1">{fmtUSD(sharedUSD / 2)} c/u en USD</p>}
          </div>
          {ivaTotal > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-xs font-medium text-orange-700">Total con IVA</p>
              <p className="text-xl font-bold text-orange-900 mt-1">{fmtARS(ivaTotal)}</p>
              <p className="text-xs text-orange-600">{included.filter(t => t.has_iva).length} transacciones</p>
            </div>
          )}
        </div>

        {/* Por tarjeta */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Por tarjeta (ARS)</h2>
          <div className="space-y-2">
            {Object.entries(byCard)
              .sort(([, a], [, b]) => b - a)
              .map(([card, total]) => (
                <div key={card} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{card}</span>
                  <span className="text-sm font-medium text-gray-900">{fmtARS(total)}</span>
                </div>
              ))}
          </div>
          <div className="flex justify-between items-center pt-3 mt-2 border-t">
            <span className="text-sm font-semibold text-gray-800">Total ARS</span>
            <span className="text-sm font-bold text-gray-900">{fmtARS(fedeARS + meliARS + sharedARS)}</span>
          </div>
          {(fedeUSD + meliUSD + sharedUSD) > 0 && (
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-semibold text-gray-800">Total USD</span>
              <span className="text-sm font-bold text-gray-900">{fmtUSD(fedeUSD + meliUSD + sharedUSD)}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function ResumenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>}>
      <ResumenContent />
    </Suspense>
  )
}
