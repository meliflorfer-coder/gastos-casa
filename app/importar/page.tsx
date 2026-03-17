'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ImportarPage() {
  const router = useRouter()
  const [csv, setCsv] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted?: number; months?: string[]; error?: string } | null>(null)

  const handleSeedHistorical = async () => {
    setLoading(true)
    setResult(null)
    const res = await fetch('/api/seed-historical', { method: 'POST' })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  const handleImport = async () => {
    if (!csv.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ error: 'Error de red' })
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Importar historial</h1>
            <p className="text-gray-500 text-sm">Pegá el contenido del CSV histórico para importarlo</p>
          </div>
          <button onClick={() => router.push('/historial')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
            ← Historial
          </button>
        </div>

        {/* Importación directa del historial 2026 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-blue-900 mb-1">Importar historial Enero–Marzo 2026</h2>
          <p className="text-sm text-blue-700 mb-4">
            Carga automáticamente las 133 transacciones del CSV ya parseado (Enero, Febrero y Marzo 2026).
            Solo funciona una vez.
          </p>
          <button
            onClick={handleSeedHistorical}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Importando...' : 'Importar historial 2026 →'}
          </button>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contenido del CSV
          </label>
          <textarea
            value={csv}
            onChange={e => setCsv(e.target.value)}
            placeholder="Pegá acá el contenido del CSV de resumen de tarjeta..."
            className="w-full h-64 border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <p className="text-xs text-gray-400 mt-2">
            El parser detecta automáticamente los meses (Enero, Febrero, Marzo...) y mapea tarjetas y asignaciones.
          </p>
        </div>

        {result && (
          <div className={`rounded-xl border p-4 mb-4 ${result.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            {result.error ? (
              <p className="text-red-700 text-sm">{result.error}</p>
            ) : (
              <div>
                <p className="text-green-800 font-semibold">{result.inserted} transacciones importadas</p>
                <p className="text-green-700 text-sm mt-1">Meses: {result.months?.join(', ')}</p>
                <button
                  onClick={() => router.push('/historial')}
                  className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
                >
                  Ver historial →
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!csv.trim() || loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Importando...' : 'Importar CSV'}
        </button>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-medium text-amber-800 mb-1">Notas sobre el mapeo automático:</p>
          <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
            <li>HSBC MC → TC MC Galicia Fede</li>
            <li>HSBC VISA → TC Visa Galicia Fede</li>
            <li>Meli TC VISA → TC Visa Galicia Meli</li>
            <li>Meli TC Galicia → TC MX Galicia Meli</li>
            <li>Meli TCMP → TC MP Meli</li>
            <li>Los gastos de hogar comunes (Edesur, gas, supermercados...) se marcan como Ambos</li>
            <li>Podés corregir asignaciones desde la vista de Revisión de cada mes</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
