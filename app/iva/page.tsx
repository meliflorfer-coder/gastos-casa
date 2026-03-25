'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface IvaDocument {
  id: string
  month: string
  filename: string
  source: string
  iva_amount: number
  notes: string | null
  created_at: string
}

const fmtARS = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export default function IvaPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [docs, setDocs] = useState<IvaDocument[]>([])
  const [months, setMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [manualSource, setManualSource] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualNotes, setManualNotes] = useState('')

  // Load available months from transactions
  useEffect(() => {
    fetch('/api/transactions?all=1')
      .then(r => r.json())
      .then((txs: any[]) => {
        const ms = Array.from(new Set(txs.map((t: any) => t.month))).sort().reverse() as string[]
        setMonths(ms)
      })
  }, [])

  // Load docs for selected month
  useEffect(() => {
    setLoading(true)
    fetch(`/api/iva-documents?month=${selectedMonth}`)
      .then(r => r.json())
      .then(data => {
        setDocs(data || [])
        setLoading(false)
      })
  }, [selectedMonth])

  const totalIva = docs.reduce((s, d) => s + (d.iva_amount || 0), 0)

  const handleFileUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    setUploadError('')

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/iva', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok || data.error) {
          setUploadError(`Error en ${file.name}: ${data.error}`)
          continue
        }

        // Save to iva_documents
        await fetch('/api/iva-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            month: selectedMonth,
            filename: file.name,
            source: file.name,
            iva_amount: data.iva_amount || 0,
            notes: data.notes || null,
          }),
        })
      } catch (err: any) {
        setUploadError(`Error procesando ${file.name}: ${err.message}`)
      }
    }

    // Reload
    const updated = await fetch(`/api/iva-documents?month=${selectedMonth}`).then(r => r.json())
    setDocs(updated || [])
    setUploading(false)
  }

  const saveEditAmount = async (id: string) => {
    const amount = parseFloat(editAmount) || 0
    await fetch('/api/iva-documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, iva_amount: amount }),
    })
    setDocs(prev => prev.map(d => d.id === id ? { ...d, iva_amount: amount } : d))
    setEditingId(null)
  }

  const deleteDoc = async (id: string) => {
    await fetch(`/api/iva-documents?id=${id}`, { method: 'DELETE' })
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  const addManual = async () => {
    if (!manualSource || !manualAmount) return
    const res = await fetch('/api/iva-documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        month: selectedMonth,
        filename: null,
        source: manualSource,
        iva_amount: parseFloat(manualAmount) || 0,
        notes: manualNotes || null,
      }),
    })
    const doc = await res.json()
    setDocs(prev => [doc, ...prev])
    setManualSource('')
    setManualAmount('')
    setManualNotes('')
    setManualMode(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFileUpload(e.dataTransfer.files)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">IVA</h1>
            <p className="text-gray-500 text-sm">Facturas y documentos fiscales</p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => router.push('/historial')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              ← Historial
            </button>
          </div>
        </div>

        {/* Total del mes */}
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-5 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 mb-1">IVA total — {selectedMonth}</p>
          <p className="text-4xl font-bold text-orange-900">{fmtARS(totalIva)}</p>
          {docs.length > 0 && (
            <p className="text-sm text-orange-700 mt-1">{docs.length} documento{docs.length !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Upload area */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 mb-5 text-center hover:border-blue-400 transition cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={e => handleFileUpload(e.target.files)}
          />
          {uploading ? (
            <div>
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500">Extrayendo IVA con IA...</p>
            </div>
          ) : (
            <div>
              <p className="text-3xl mb-2">📄</p>
              <p className="text-sm font-medium text-gray-700">Arrastrá o hacé click para subir facturas / fotos</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — la IA extrae el IVA automáticamente</p>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
            {uploadError}
          </div>
        )}

        {/* Manual entry */}
        <div className="mb-5">
          {manualMode ? (
            <div className="bg-white border rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Carga manual</p>
              <input
                type="text"
                placeholder="Concepto / fuente (ej: Factura Edesur)"
                value={manualSource}
                onChange={e => setManualSource(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Monto IVA ($)"
                  value={manualAmount}
                  onChange={e => setManualAmount(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Notas (opcional)"
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={addManual} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                  Agregar
                </button>
                <button onClick={() => setManualMode(false)} className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setManualMode(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              + Agregar manualmente
            </button>
          )}
        </div>

        {/* Documents list */}
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
        ) : docs.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-gray-400 text-sm">
            No hay documentos para {selectedMonth}
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Fuente / Concepto</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs text-gray-400">Notas</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">IVA</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{doc.source || doc.filename || '—'}</div>
                      {doc.filename && doc.source !== doc.filename && (
                        <div className="text-xs text-gray-400 mt-0.5">{doc.filename}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{doc.notes || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-orange-700">
                      {editingId === doc.id ? (
                        <input
                          autoFocus
                          type="number"
                          value={editAmount}
                          onChange={e => setEditAmount(e.target.value)}
                          onBlur={() => saveEditAmount(doc.id)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEditAmount(doc.id); if (e.key === 'Escape') setEditingId(null) }}
                          className="w-28 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span
                          className="cursor-text hover:bg-orange-50 px-1 rounded"
                          onDoubleClick={() => { setEditingId(doc.id); setEditAmount(String(doc.iva_amount)) }}
                          title="Doble click para editar"
                        >
                          {fmtARS(doc.iva_amount)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => deleteDoc(doc.id)}
                        className="text-gray-300 hover:text-red-500 text-lg leading-none"
                        title="Eliminar"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Total IVA</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-800">{fmtARS(totalIva)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
