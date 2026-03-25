'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Transaction } from '@/lib/types'

interface MonthRecord {
  month: string
  status: 'open' | 'closed'
  previous_debt_ars: number
  previous_debt_usd: number
  notes: string | null
  closed_at: string | null
}

function cardOwner(card: string): 'fede' | 'meli' | null {
  const lower = card.toLowerCase()
  if (lower.includes('fede')) return 'fede'
  if (lower.includes('meli')) return 'meli'
  return null
}

function ResumenContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const month = searchParams.get('month') || ''

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthRecord, setMonthRecord] = useState<MonthRecord | null>(null)
  const [carryoverARS, setCarryoverARS] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!month) return
    Promise.all([
      fetch(`/api/transactions?month=${month}`).then(r => r.json()),
      fetch(`/api/months?month=${month}`).then(r => r.json()),
    ]).then(([txData, monthData]) => {
      setTransactions(txData || [])
      if (monthData) {
        setMonthRecord(monthData)
        setCarryoverARS(monthData.previous_debt_ars || 0)
      }
      setLoading(false)
    })
  }, [month])

  const included = transactions.filter(t => t.include && t.assignment !== 'ignorar' && t.assignment !== 'familia_meli')
  const arsItems = included.filter(t => !t.amount_usd || t.amount_usd === 0)
  const usdItems = included.filter(t => t.amount_usd > 0)

  // Totales simples por asignación (ARS)
  const fedeARS = arsItems.filter(t => t.assignment === 'fede').reduce((s, t) => s + t.amount_ars, 0)
  const meliARS = arsItems.filter(t => t.assignment === 'meli').reduce((s, t) => s + t.amount_ars, 0)
  const sharedARS = arsItems.filter(t => t.assignment === 'ambos').reduce((s, t) => s + t.amount_ars, 0)

  // Totales simples por asignación (USD)
  const fedeUSD = usdItems.filter(t => t.assignment === 'fede').reduce((s, t) => s + t.amount_usd, 0)
  const meliUSD = usdItems.filter(t => t.assignment === 'meli').reduce((s, t) => s + t.amount_usd, 0)
  const sharedUSD = usdItems.filter(t => t.assignment === 'ambos').reduce((s, t) => s + t.amount_usd, 0)

  const ivaTotal = included.filter(t => t.has_iva).reduce((s, t) => s + t.amount_ars, 0)
  const familyMeliTotal = transactions.filter(t => t.include && t.assignment === 'familia_meli').reduce((s, t) => s + t.amount_ars, 0)

  // ── Cálculo de transferencia neta (ARS) ──────────────────────────────────
  // Por cada transacción se determina quién pagó (tarjeta) y a quién corresponde.
  // Si Fede pagó algo que le corresponde a Meli → meliOwesFede
  // Si Meli pagó algo que le corresponde a Fede → fedeOwesMeli
  // Los gastos "ambos" se dividen 50/50 sobre quien pagó.
  let meliOwesFedeARS = 0
  let fedeOwesMeliARS = 0
  let meliOwesFedeUSD = 0
  let fedeOwesMeliUSD = 0

  for (const t of included) {
    const owner = cardOwner(t.card)
    if (!owner) continue

    if (t.amount_usd > 0) {
      const amt = t.amount_usd
      if (owner === 'fede') {
        if (t.assignment === 'meli') meliOwesFedeUSD += amt
        else if (t.assignment === 'ambos') meliOwesFedeUSD += amt / 2
      } else {
        if (t.assignment === 'fede') fedeOwesMeliUSD += amt
        else if (t.assignment === 'ambos') fedeOwesMeliUSD += amt / 2
      }
    } else {
      const amt = t.amount_ars
      if (owner === 'fede') {
        if (t.assignment === 'meli') meliOwesFedeARS += amt
        else if (t.assignment === 'ambos') meliOwesFedeARS += amt / 2
      } else {
        if (t.assignment === 'fede') fedeOwesMeliARS += amt
        else if (t.assignment === 'ambos') fedeOwesMeliARS += amt / 2
      }
    }
  }

  const netARS = meliOwesFedeARS - fedeOwesMeliARS + carryoverARS
  const netUSD = meliOwesFedeUSD - fedeOwesMeliUSD

  // Si netARS > 0: Meli le debe a Fede; si < 0: Fede le debe a Meli
  const transferDirectionARS = netARS >= 0 ? 'meli→fede' : 'fede→meli'
  const transferAmountARS = Math.abs(netARS)
  const transferDirectionUSD = netUSD >= 0 ? 'meli→fede' : 'fede→meli'
  const transferAmountUSD = Math.abs(netUSD)

  const fmtARS = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
  const fmtUSD = (n: number) => `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const saveCarryover = async () => {
    setSaving(true)
    await fetch('/api/months', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, previous_debt_ars: carryoverARS }),
    })
    setSaving(false)
  }

  const toggleClose = async () => {
    const newStatus = monthRecord?.status === 'closed' ? 'open' : 'closed'
    setSaving(true)
    const res = await fetch('/api/months', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, status: newStatus }),
    })
    const data = await res.json()
    setMonthRecord(data)
    setSaving(false)
  }

  const exportCSV = () => {
    const headers = ['Fecha', 'Tarjeta', 'Descripción', 'Importe ARS', 'Importe USD', 'Cuota', 'Asignación', 'IVA', 'Incluido']
    const rows = transactions.map(t => [
      t.date, t.card, t.description, t.amount_ars, t.amount_usd || '',
      t.installment_number ? `${t.installment_number}/${t.installment_total}` : '',
      t.assignment, t.has_iva ? 'SI' : 'NO', t.include ? 'SI' : 'NO',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `gastos-${month}.csv`; a.click()
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

  const isClosed = monthRecord?.status === 'closed'

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Resumen — {month}</h1>
              {isClosed && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Cerrado</span>}
            </div>
            <p className="text-gray-500 text-sm">{included.length} transacciones incluidas</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Exportar CSV
            </button>
            <button onClick={() => router.push('/historial')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Historial
            </button>
            <button onClick={() => router.push(`/revision?month=${month}`)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              ← Revisión
            </button>
          </div>
        </div>

        {/* Deuda mes anterior */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <label className="block text-xs font-medium text-gray-600 mb-2">Deuda del mes anterior (ARS)</label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-sm">$</span>
              <input
                type="number"
                value={carryoverARS}
                onChange={e => setCarryoverARS(Number(e.target.value))}
                disabled={isClosed}
                className="border rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            {!isClosed && (
              <button
                onClick={saveCarryover}
                disabled={saving}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            )}
          </div>
        </div>

        {/* Transferencia neta — resultado principal */}
        <div className={`rounded-xl border-2 p-5 mb-5 ${netARS >= 0 ? 'bg-purple-50 border-purple-300' : 'bg-green-50 border-green-300'}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Transferencia neta ARS</p>
          <p className={`text-4xl font-bold mb-1 ${netARS >= 0 ? 'text-purple-900' : 'text-green-900'}`}>
            {fmtARS(transferAmountARS)}
          </p>
          <p className={`text-sm font-medium ${netARS >= 0 ? 'text-purple-700' : 'text-green-700'}`}>
            {transferDirectionARS === 'meli→fede' ? 'Meli transfiere a Fede' : 'Fede transfiere a Meli'}
          </p>
          <div className={`mt-3 text-xs space-y-1 ${netARS >= 0 ? 'text-purple-600' : 'text-green-600'}`}>
            <div className="flex justify-between"><span>Meli le debe a Fede:</span><span>{fmtARS(meliOwesFedeARS)}</span></div>
            <div className="flex justify-between"><span>Fede le debe a Meli:</span><span>{fmtARS(fedeOwesMeliARS)}</span></div>
            {carryoverARS !== 0 && <div className="flex justify-between"><span>Deuda anterior:</span><span>{fmtARS(carryoverARS)}</span></div>}
          </div>
        </div>

        {/* Transferencia neta USD (solo si hay) */}
        {(transferAmountUSD > 0 || netUSD !== 0) && (
          <div className={`rounded-xl border-2 p-4 mb-5 ${netUSD >= 0 ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Transferencia neta USD</p>
            <p className={`text-2xl font-bold mb-1 ${netUSD >= 0 ? 'text-purple-900' : 'text-green-900'}`}>
              {fmtUSD(transferAmountUSD)}
            </p>
            <p className={`text-sm font-medium ${netUSD >= 0 ? 'text-purple-700' : 'text-green-700'}`}>
              {transferDirectionUSD === 'meli→fede' ? 'Meli transfiere a Fede' : 'Fede transfiere a Meli'}
            </p>
          </div>
        )}

        {/* Totales ARS por persona */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Totales por persona (ARS)</h2>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <p className="text-sm font-medium text-green-700 mb-1">Fede</p>
            <p className="text-2xl font-bold text-green-900">{fmtARS(fedeARS + sharedARS / 2)}</p>
            <div className="mt-3 space-y-1 text-xs text-green-700">
              <div className="flex justify-between"><span>Propios:</span><span>{fmtARS(fedeARS)}</span></div>
              <div className="flex justify-between"><span>50% compartidos:</span><span>{fmtARS(sharedARS / 2)}</span></div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <p className="text-sm font-medium text-purple-700 mb-1">Meli</p>
            <p className="text-2xl font-bold text-purple-900">{fmtARS(meliARS + sharedARS / 2)}</p>
            <div className="mt-3 space-y-1 text-xs text-purple-700">
              <div className="flex justify-between"><span>Propios:</span><span>{fmtARS(meliARS)}</span></div>
              <div className="flex justify-between"><span>50% compartidos:</span><span>{fmtARS(sharedARS / 2)}</span></div>
            </div>
          </div>
        </div>

        {/* Totales USD por persona */}
        {(fedeUSD + meliUSD + sharedUSD) > 0 && (
          <>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Totales por persona (USD)</h2>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-medium text-green-700 mb-1">Fede</p>
                <p className="text-xl font-bold text-green-900">{fmtUSD(fedeUSD + sharedUSD / 2)}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-sm font-medium text-purple-700 mb-1">Meli</p>
                <p className="text-xl font-bold text-purple-900">{fmtUSD(meliUSD + sharedUSD / 2)}</p>
              </div>
            </div>
          </>
        )}

        {/* Extras */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-700">Total compartido ARS</p>
            <p className="text-xl font-bold text-blue-900 mt-1">{fmtARS(sharedARS)}</p>
            <p className="text-xs text-blue-600">{fmtARS(sharedARS / 2)} c/u</p>
            {sharedUSD > 0 && <p className="text-xs text-blue-600 mt-1">{fmtUSD(sharedUSD / 2)} c/u en USD</p>}
          </div>
          <div className="space-y-3">
            {ivaTotal > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-xs font-medium text-orange-700">Total con IVA</p>
                <p className="text-xl font-bold text-orange-900 mt-1">{fmtARS(ivaTotal)}</p>
                <p className="text-xs text-orange-600">{included.filter(t => t.has_iva).length} transacciones</p>
              </div>
            )}
            {familyMeliTotal > 0 && (
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                <p className="text-xs font-medium text-pink-700">Familia Meli (excluido)</p>
                <p className="text-xl font-bold text-pink-900 mt-1">{fmtARS(familyMeliTotal)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Por tarjeta */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-3">Por tarjeta (ARS)</h2>
          <div className="space-y-2">
            {Object.entries(byCard).sort(([, a], [, b]) => b - a).map(([card, total]) => (
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

        {/* Cerrar/reabrir mes */}
        <div className="bg-white rounded-xl border shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Estado del mes</p>
            <p className="text-xs text-gray-500">
              {isClosed
                ? `Cerrado el ${monthRecord?.closed_at ? new Date(monthRecord.closed_at).toLocaleDateString('es-AR') : '—'}`
                : 'Abierto — podés seguir editando'}
            </p>
          </div>
          <button
            onClick={toggleClose}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition ${
              isClosed
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {saving ? '...' : isClosed ? 'Reabrir mes' : 'Cerrar mes'}
          </button>
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
