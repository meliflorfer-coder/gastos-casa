'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface MonthData {
  month: string
  total: number
  fede: number
  meli: number
  shared: number
  count: number
  net: number // positive = meli owes fede, negative = fede owes meli
}

const fmtARS = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

const COLORS = { fede: '#22c55e', meli: '#a855f7', shared: '#3b82f6', net: '#f59e0b' }

export default function GraficosPage() {
  const router = useRouter()
  const [data, setData] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)
  const [fromYear, setFromYear] = useState('')
  const [toYear, setToYear] = useState('')

  useEffect(() => {
    fetch('/api/transactions?all=1')
      .then(r => r.json())
      .then((txs: any[]) => {
        const map = new Map<string, MonthData>()
        for (const t of txs) {
          if (!t.include || t.assignment === 'ignorar' || t.assignment === 'familia_meli') continue
          if (t.amount_usd > 0) continue // solo ARS para simplificar

          if (!map.has(t.month)) {
            map.set(t.month, { month: t.month, total: 0, fede: 0, meli: 0, shared: 0, count: 0, net: 0 })
          }
          const row = map.get(t.month)!
          const ars = t.amount_ars || 0
          row.count++
          row.total += ars

          if (t.assignment === 'fede') row.fede += ars
          else if (t.assignment === 'meli') row.meli += ars
          else if (t.assignment === 'ambos') row.shared += ars

          // Net transfer: card owner pays, other owes
          const card = (t.card || '').toLowerCase()
          const owner = card.includes('fede') ? 'fede' : card.includes('meli') ? 'meli' : null
          if (owner === 'fede') {
            if (t.assignment === 'meli') row.net += ars
            else if (t.assignment === 'ambos') row.net += ars / 2
          } else if (owner === 'meli') {
            if (t.assignment === 'fede') row.net -= ars
            else if (t.assignment === 'ambos') row.net -= ars / 2
          }
        }
        const sorted = Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
        setData(sorted)
        setLoading(false)
      })
  }, [])

  const years = Array.from(new Set(data.map(d => d.month.slice(0, 4)))).sort()
  const filtered = data.filter(d => {
    const year = d.month.slice(0, 4)
    if (fromYear && year < fromYear) return false
    if (toYear && year > toYear) return false
    return true
  })

  // Chart data: shorten month label
  const chartData = filtered.map(d => ({
    ...d,
    label: d.month.slice(2), // "2024-03" → "24-03"
    fedeTotal: Math.round(d.fede + d.shared / 2),
    meliTotal: Math.round(d.meli + d.shared / 2),
  }))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Cargando datos...</p>
    </div>
  )

  // Summary stats
  const avgTotal = filtered.length > 0 ? filtered.reduce((s, d) => s + d.total, 0) / filtered.length : 0
  const maxMonth = filtered.reduce((best, d) => d.total > best.total ? d : best, filtered[0] || { month: '-', total: 0 })
  const totalAll = filtered.reduce((s, d) => s + d.total, 0)

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gráficos</h1>
            <p className="text-gray-500 text-sm">{filtered.length} meses · {filtered[0]?.month} → {filtered[filtered.length - 1]?.month}</p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-500">Desde</span>
            <select
              value={fromYear}
              onChange={e => setFromYear(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
            <span className="text-sm text-gray-500">Hasta</span>
            <select
              value={toYear}
              onChange={e => setToYear(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
            <button onClick={() => router.push('/historial')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              ← Historial
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <p className="text-xs text-gray-500">Total acumulado</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmtARS(totalAll)}</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <p className="text-xs text-gray-500">Promedio mensual</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmtARS(avgTotal)}</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <p className="text-xs text-gray-500">Mes más caro</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmtARS(maxMonth?.total || 0)}</p>
            <p className="text-xs text-gray-400">{maxMonth?.month}</p>
          </div>
        </div>

        {/* Gasto total mensual */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Gasto total mensual (ARS)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={filtered.length > 24 ? 5 : 1} />
              <YAxis tickFormatter={fmtARS} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmtARS(Number(v))} labelFormatter={l => `Mes: ${l}`} />
              <Bar dataKey="total" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Total ARS" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fede vs Meli */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Fede vs Meli (cada uno paga)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={filtered.length > 24 ? 5 : 1} />
              <YAxis tickFormatter={fmtARS} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmtARS(Number(v))} />
              <Legend />
              <Bar dataKey="fedeTotal" fill={COLORS.fede} radius={[3, 3, 0, 0]} name="Fede" stackId="a" />
              <Bar dataKey="meliTotal" fill={COLORS.meli} radius={[3, 3, 0, 0]} name="Meli" stackId="b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Compartido vs Personal */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Compartido vs Personal (ARS)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={filtered.length > 24 ? 5 : 1} />
              <YAxis tickFormatter={fmtARS} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmtARS(Number(v))} />
              <Legend />
              <Bar dataKey="shared" fill={COLORS.shared} name="Compartido" stackId="a" />
              <Bar dataKey="fede" fill={COLORS.fede} name="Personal Fede" stackId="a" />
              <Bar dataKey="meli" fill={COLORS.meli} name="Personal Meli" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Transferencia neta */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Transferencia neta estimada por mes</h2>
          <p className="text-xs text-gray-400 mb-4">Positivo = Meli transfiere a Fede · Negativo = Fede transfiere a Meli</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={filtered.length > 24 ? 5 : 1} />
              <YAxis tickFormatter={fmtARS} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmtARS(Number(v))} />
              <Line
                type="monotone"
                dataKey="net"
                stroke={COLORS.net}
                strokeWidth={2}
                dot={false}
                name="Neto"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  )
}
