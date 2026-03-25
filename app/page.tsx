'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Transaction } from '@/lib/types'

const CARDS = [
  'Debito Galicia Fede',
  'Debito Galicia Meli',
  'Debito Santander Meli',
  'TC Visa Santander Meli',
  'TC Amex Santander Meli',
  'TC Visa Galicia Fede',
  'TC MC Galicia Fede',
  'TC Visa Galicia Meli',
  'TC MX Galicia Meli',
  'TC MP Meli',
  'Gastos manuales',
]

function guessCard(filename: string): string {
  const f = filename.toLowerCase()
  if (f.includes('amex')) return 'TC Amex Santander Meli'
  if (f.includes('santander') && f.includes('visa')) return 'TC Visa Santander Meli'
  if (f.includes('santander')) return 'TC Visa Santander Meli'
  if (f.includes('galicia') && f.includes('mc')) return 'TC MC Galicia Fede'
  if (f.includes('galicia') && f.includes('visa') && f.includes('fede')) return 'TC Visa Galicia Fede'
  if (f.includes('galicia') && f.includes('visa') && f.includes('meli')) return 'TC Visa Galicia Meli'
  if (f.includes('galicia') && f.includes('mx')) return 'TC MX Galicia Meli'
  if (f.includes('galicia') && f.includes('debito') && f.includes('fede')) return 'Debito Galicia Fede'
  if (f.includes('galicia') && f.includes('debito') && f.includes('meli')) return 'Debito Galicia Meli'
  if (f.includes('galicia') && f.includes('debito')) return 'Debito Galicia Fede'
  if (f.includes('galicia') && f.includes('visa')) return 'TC Visa Galicia Fede'
  if (f.includes('galicia')) return 'TC Visa Galicia Fede'
  if (f.includes('mercadopago') || f.includes('mp')) return 'TC MP Meli'
  return CARDS[0]
}

const EMPTY_MANUAL = { date: '', description: '', amount_ars: '', amount_usd: '', card: 'Gastos manuales' }

function formatMonthLabel(m: string) {
  const [year, month] = m.split('-')
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${names[parseInt(month) - 1]} ${year}`
}

export default function Home() {
  const router = useRouter()
  const [files, setFiles] = useState<{ file: File; card: string }[]>([])
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [manualRows, setManualRows] = useState([{ ...EMPTY_MANUAL }])
  const [existingCount, setExistingCount] = useState<number | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [monthStatus, setMonthStatus] = useState<'open' | 'closed' | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!month) return
    setExistingCount(null)
    setPendingCount(0)
    setMonthStatus(null)

    Promise.all([
      fetch(`/api/transactions?month=${month}`).then(r => r.json()),
      fetch(`/api/months?month=${month}`).then(r => r.json()),
    ]).then(([txData, monthData]) => {
      const txs = Array.isArray(txData) ? txData : []
      setExistingCount(txs.length)
      setPendingCount(txs.filter((t: any) => !t.user_reviewed).length)
      setMonthStatus(monthData?.status || null)
      // Auto-show import if no data yet
      setShowImport(txs.length === 0)
    }).catch(() => {
      setExistingCount(0)
      setShowImport(true)
    })
  }, [month])

  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter(f => f.name.endsWith('.pdf'))
    setFiles(prev => [...prev, ...arr.map(f => ({ file: f, card: guessCard(f.name) }))])
  }

  const updateCard = (index: number, card: string) => {
    setFiles(prev => prev.map((f, i) => (i === index ? { ...f, card } : f)))
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const updateManual = (index: number, field: string, value: string) => {
    setManualRows(prev => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  const addManualRow = () => setManualRows(prev => [...prev, { ...EMPTY_MANUAL }])

  const removeManualRow = (index: number) => {
    setManualRows(prev => prev.filter((_, i) => i !== index))
  }

  const validManualRows = manualRows.filter(r => r.description.trim() && (r.amount_ars || r.amount_usd))

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = () => setDragOver(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const doProcess = async (replaceExisting: boolean) => {
    setLoading(true)
    setConfirmReplace(false)

    if (replaceExisting) {
      setProgress('Eliminando transacciones anteriores del mes...')
      await fetch(`/api/transactions?month=${month}`, { method: 'DELETE' })
    }

    const allTransactions: Transaction[] = []

    for (const { file, card } of files) {
      setProgress(`Procesando ${file.name}...`)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('card', card)
      formData.append('month', month)
      try {
        const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.transactions) allTransactions.push(...data.transactions)
      } catch (err) {
        console.error(`Error procesando ${file.name}:`, err)
      }
    }

    for (const r of validManualRows) {
      allTransactions.push({
        date: r.date || `${month}-01`,
        description: r.description.trim(),
        amount_ars: parseFloat(r.amount_ars) || 0,
        amount_usd: parseFloat(r.amount_usd) || 0,
        card: r.card,
        month,
        source_file: 'manual',
        fx_rate: 0,
        assignment: 'ambos',
        has_iva: false,
        include: true,
        installment_number: null,
        installment_total: null,
      } as any)
    }

    setProgress('Guardando en base de datos...')
    const saveRes = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: allTransactions }),
    })
    const saved = await saveRes.json()

    if (saved?.length) {
      setProgress('Aplicando clasificaciones previas...')
      const ids = saved.map((t: any) => t.id)
      await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, ids }),
      })
    }

    setLoading(false)
    router.push(`/revision?month=${month}`)
  }

  const handleProcess = () => {
    if (existingCount && existingCount > 0 && (files.length > 0 || validManualRows.length > 0)) {
      setConfirmReplace(true)
      return
    }
    doProcess(false)
  }

  const canProcess = (files.length > 0 || validManualRows.length > 0) && !loading

  const processLabel = loading
    ? progress || 'Procesando...'
    : [
        files.length > 0 ? `${files.length} PDF${files.length !== 1 ? 's' : ''}` : '',
        validManualRows.length > 0 ? `${validManualRows.length} manual${validManualRows.length !== 1 ? 'es' : ''}` : '',
      ].filter(Boolean).join(' + ') || 'Procesar'

  const hasTxs = existingCount !== null && existingCount > 0
  const isClosed = monthStatus === 'closed'

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Gastos Casa</h1>
        <div className="flex gap-2">
          <button onClick={() => router.push('/historial')} className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100">
            Historial
          </button>
          <button onClick={() => router.push('/graficos')} className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100">
            Gráficos
          </button>
          <button onClick={() => router.push('/iva')} className="text-sm text-orange-600 hover:text-orange-800 px-3 py-1.5 rounded-lg hover:bg-orange-50">
            IVA
          </button>
          <button onClick={() => router.push('/cuotas')} className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100">
            Cuotas
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        {/* Mes selector */}
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-4">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Mes</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dashboard: estado del mes (solo si hay datos) */}
        {hasTxs && (
          <div className={`rounded-xl border-2 p-5 mb-4 ${isClosed ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-gray-900">{formatMonthLabel(month)}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isClosed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {isClosed ? 'Cerrado' : 'Abierto'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {existingCount} transacciones
                  {pendingCount > 0 && (
                    <span className="ml-2 text-amber-700 font-medium">· {pendingCount} pendientes de revisar</span>
                  )}
                  {pendingCount === 0 && <span className="ml-2 text-green-600 font-medium">· Todo revisado</span>}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => router.push(`/revision?month=${month}`)}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                {pendingCount > 0 ? `Revisar (${pendingCount} pendientes)` : 'Revisión del mes'}
              </button>
              <button
                onClick={() => router.push(`/resumen?month=${month}`)}
                className="flex-1 border border-gray-300 bg-white text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Ver resumen
              </button>
              <button
                onClick={() => router.push(`/iva?month=${month}`)}
                className="border border-orange-300 bg-white text-orange-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-50 transition"
              >
                IVA
              </button>
            </div>
          </div>
        )}

        {/* Toggle import */}
        {hasTxs && (
          <button
            onClick={() => setShowImport(v => !v)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 mb-3 flex items-center justify-center gap-1"
          >
            <span>{showImport ? '▲' : '▼'}</span>
            {showImport ? 'Ocultar importación' : 'Importar más PDFs / gastos manuales'}
          </button>
        )}

        {/* Import section */}
        {showImport && (
          <>
            {/* Upload */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Resúmenes PDF</h2>
                <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
                  + Agregar PDFs
                  <input type="file" accept=".pdf" multiple onChange={e => e.target.files && addFiles(e.target.files)} className="hidden" />
                </label>
              </div>
              <div
                ref={dropRef}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`rounded-lg border-2 border-dashed transition mb-3 ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'} ${files.length === 0 ? 'py-10' : 'py-3'}`}
              >
                {files.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center">Arrastrá los PDFs acá o usá el botón</p>
                ) : (
                  <div className="space-y-2 px-3">
                    {files.map(({ file, card }, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="text-xl">📄</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                          <select
                            value={card}
                            onChange={e => updateCard(i, e.target.value)}
                            className="mt-1 text-xs border rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {CARDS.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 text-lg px-2">×</button>
                      </div>
                    ))}
                    {dragOver && <p className="text-blue-500 text-xs text-center py-2">Soltá para agregar más PDFs</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Gastos manuales */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Gastos manuales</h2>
                <button onClick={addManualRow} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  + Agregar fila
                </button>
              </div>
              <div className="space-y-3">
                {manualRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input type="date" value={row.date} onChange={e => updateManual(i, 'date', e.target.value)}
                      className="col-span-3 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <input type="text" value={row.description} onChange={e => updateManual(i, 'description', e.target.value)}
                      placeholder="Descripción *" className="col-span-4 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <input type="number" value={row.amount_ars} onChange={e => updateManual(i, 'amount_ars', e.target.value)}
                      placeholder="ARS" className="col-span-2 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <input type="number" value={row.amount_usd} onChange={e => updateManual(i, 'amount_usd', e.target.value)}
                      placeholder="USD" className="col-span-2 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <button onClick={() => removeManualRow(i)} className="col-span-1 text-gray-400 hover:text-red-500 text-lg text-center">×</button>
                    <select value={row.card} onChange={e => updateManual(i, 'card', e.target.value)}
                      className="col-span-11 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                      {CARDS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <div className="col-span-1" />
                  </div>
                ))}
              </div>
              {validManualRows.length > 0 && (
                <p className="text-xs text-green-600 mt-3">{validManualRows.length} gasto{validManualRows.length !== 1 ? 's' : ''} listo{validManualRows.length !== 1 ? 's' : ''} para guardar</p>
              )}
            </div>

            {/* Procesar */}
            <button
              onClick={handleProcess}
              disabled={!canProcess}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition mb-4"
            >
              {loading ? processLabel : `Procesar ${processLabel}`}
            </button>
          </>
        )}

        {/* Nav grid secundario */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <button onClick={() => router.push('/historial')}
            className="bg-white border border-gray-200 text-gray-700 py-4 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition flex flex-col items-center gap-1">
            <span className="text-xl">📋</span>
            Historial
          </button>
          <button onClick={() => router.push('/graficos')}
            className="bg-white border border-blue-200 text-blue-700 py-4 rounded-xl text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition flex flex-col items-center gap-1">
            <span className="text-xl">📊</span>
            Gráficos
          </button>
          <button onClick={() => router.push('/iva')}
            className="bg-white border border-orange-200 text-orange-700 py-4 rounded-xl text-sm font-medium hover:bg-orange-50 hover:border-orange-300 transition flex flex-col items-center gap-1">
            <span className="text-xl">🧾</span>
            IVA
          </button>
          <button onClick={() => router.push('/cuotas')}
            className="bg-white border border-gray-200 text-gray-700 py-4 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition flex flex-col items-center gap-1">
            <span className="text-xl">💳</span>
            Cuotas
          </button>
          {!hasTxs && (
            <button onClick={() => setShowImport(true)}
              className="col-span-2 bg-blue-600 text-white py-4 rounded-xl text-sm font-medium hover:bg-blue-700 transition flex flex-col items-center gap-1">
              <span className="text-xl">📥</span>
              Importar mes
            </button>
          )}
        </div>

        {/* Modal confirmación reemplazar */}
        {confirmReplace && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
              <h3 className="font-semibold text-gray-900 mb-2">Este mes ya tiene datos</h3>
              <p className="text-sm text-gray-600 mb-5">
                {month} ya tiene <strong>{existingCount} transacciones</strong>. ¿Querés agregar las nuevas o reemplazar todo?
              </p>
              <div className="flex gap-3">
                <button onClick={() => doProcess(true)} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                  Reemplazar todo
                </button>
                <button onClick={() => doProcess(false)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  Agregar
                </button>
                <button onClick={() => setConfirmReplace(false)} className="px-4 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
