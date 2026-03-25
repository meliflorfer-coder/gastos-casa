'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Transaction, Assignment, CATEGORIES } from '@/lib/types'

const ASSIGNMENTS: { value: Assignment; label: string; color: string }[] = [
  { value: 'ambos', label: 'Ambos', color: 'bg-blue-100 text-blue-800' },
  { value: 'fede', label: 'Fede', color: 'bg-green-100 text-green-800' },
  { value: 'meli', label: 'Meli', color: 'bg-purple-100 text-purple-800' },
  { value: 'familia_meli', label: 'Familia Meli', color: 'bg-pink-100 text-pink-800' },
  { value: 'ignorar', label: 'Ignorar', color: 'bg-gray-100 text-gray-500' },
]

function RevisionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const month = searchParams.get('month') || ''

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [filterCard, setFilterCard] = useState('todas')
  const [filterPending, setFilterPending] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [focusedRow, setFocusedRow] = useState(0)
  const [duplicates, setDuplicates] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!month) return
    fetch(`/api/transactions?month=${month}`)
      .then(r => r.json())
      .then(data => {
        const txs = data || []
        setTransactions(txs)
        setLoading(false)
        // Detectar duplicados: misma descripción + importe dentro del mes
        const seen = new Map<string, string>()
        const dups = new Set<string>()
        for (const t of txs) {
          const key = `${t.description?.toLowerCase().trim()}|${t.amount_ars}|${t.amount_usd}`
          if (seen.has(key)) {
            dups.add(t.id!)
            dups.add(seen.get(key)!)
          } else {
            seen.set(key, t.id!)
          }
        }
        setDuplicates(dups)
      })
  }, [month])

  const update = useCallback(async (id: string, field: string, value: any) => {
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, [field]: value, user_reviewed: true } : t))
    )
    setSaving(id)
    await fetch('/api/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: value, user_reviewed: true }),
    })
    setSaving(null)
  }, [])

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
  }

  const bulkAssign = async (assignment: Assignment) => {
    const visible = filtered.filter(t => t.include)
    for (const t of visible) {
      if (t.id) await update(t.id, 'assignment', assignment)
    }
  }

  const startEdit = (id: string, field: string, currentValue: string) => {
    setEditingCell({ id, field })
    setEditValue(String(currentValue ?? ''))
  }

  const commitEdit = async () => {
    if (!editingCell) return
    const { id, field } = editingCell
    const val = field.startsWith('amount') ? parseFloat(editValue) || 0 : editValue
    await update(id, field, val)
    setEditingCell(null)
  }

  const cards = ['todas', ...Array.from(new Set(transactions.map(t => t.card)))]
  const pendingCount = transactions.filter(t => !t.user_reviewed).length

  const filtered = transactions.filter(t => {
    const matchText = t.description?.toLowerCase().includes(filter.toLowerCase())
    const matchCard = filterCard === 'todas' || t.card === filterCard
    const matchPending = !filterPending || !t.user_reviewed
    const matchCategory = !filterCategory || t.category === filterCategory
    return matchText && matchCard && matchPending && matchCategory
  })

  // Atajos de teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      const t = filtered[focusedRow]
      if (!t?.id) return
      if (e.key === 'a' || e.key === 'A') update(t.id, 'assignment', 'ambos')
      if (e.key === 'f' || e.key === 'F') update(t.id, 'assignment', 'fede')
      if (e.key === 'm' || e.key === 'M') update(t.id, 'assignment', 'meli')
      if (e.key === 'g' || e.key === 'G') update(t.id, 'assignment', 'familia_meli')
      if (e.key === 'i' || e.key === 'I') update(t.id, 'assignment', 'ignorar')
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedRow(r => Math.min(r + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedRow(r => Math.max(r - 1, 0)) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, focusedRow, update])

  const formatAmount = (n: number) =>
    n ? `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Cargando transacciones...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revisión — {month}</h1>
            <p className="text-gray-500 text-sm flex items-center gap-2">
              {transactions.length} transacciones
              {pendingCount > 0 && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">{pendingCount} pendientes</span>}
              {duplicates.size > 0 && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">⚠ {duplicates.size} posibles duplicados</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/historial')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Historial
            </button>
            <button onClick={() => router.push('/')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              ← Volver
            </button>
            <button onClick={() => router.push(`/resumen?month=${month}`)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              Ver resumen →
            </button>
          </div>
        </div>

        {/* Hint atajos */}
        <p className="text-xs text-gray-400 mb-3">
          Atajos (navegá con <kbd className="bg-gray-100 px-1 rounded">↑↓</kbd>):&nbsp;
          <kbd className="bg-gray-100 px-1 rounded">A</kbd> Ambos ·&nbsp;
          <kbd className="bg-gray-100 px-1 rounded">F</kbd> Fede ·&nbsp;
          <kbd className="bg-gray-100 px-1 rounded">M</kbd> Meli ·&nbsp;
          <kbd className="bg-gray-100 px-1 rounded">G</kbd> Familia Meli ·&nbsp;
          <kbd className="bg-gray-100 px-1 rounded">I</kbd> Ignorar · Doble click en descripción/importe para editar
        </p>

        {/* Filtros */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Buscar descripción..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterCard}
            onChange={e => setFilterCard(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {cards.map(c => <option key={c}>{c}</option>)}
          </select>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.filter(c => c).map(c => <option key={c}>{c}</option>)}
          </select>
          <button
            onClick={() => setFilterPending(!filterPending)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${filterPending ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            {filterPending ? '⚡ Solo pendientes' : 'Todos'}
            {pendingCount > 0 && !filterPending && <span className="ml-1 bg-yellow-200 text-yellow-800 rounded-full px-1.5">{pendingCount}</span>}
          </button>
          <span className="text-gray-400 text-sm">Asignar visibles:</span>
          {ASSIGNMENTS.map(a => (
            <button key={a.value} onClick={() => bulkAssign(a.value)} className={`px-3 py-1 rounded-full text-xs font-medium ${a.color} hover:opacity-80`}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 w-10">Inc.</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600">Fecha</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600">Tarjeta</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600">Descripción</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600">Importe</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-600">Cuota</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-600">Asignación</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-600">Categoría</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-600">IVA</th>
                  <th className="px-3 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t, rowIdx) => (
                  <tr
                    key={t.id}
                    onClick={() => setFocusedRow(rowIdx)}
                    className={`transition cursor-default
                      ${!t.include || t.assignment === 'ignorar' ? 'opacity-40' : ''}
                      ${saving === t.id ? 'bg-yellow-50' : ''}
                      ${focusedRow === rowIdx ? 'bg-blue-50' : 'hover:bg-gray-50'}
                      ${duplicates.has(t.id!) ? 'ring-1 ring-inset ring-red-300' : ''}
                    `}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={t.include}
                        onChange={e => t.id && update(t.id, 'include', e.target.checked)}
                        className="rounded"
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{t.date}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full whitespace-nowrap">{t.card}</span>
                    </td>
                    <td className="px-3 py-2.5 max-w-xs">
                      {editingCell?.id === t.id && editingCell?.field === 'description' ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null) }}
                          className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-gray-800 truncate cursor-text hover:bg-gray-100 px-1 rounded"
                            onDoubleClick={e => { e.stopPropagation(); t.id && startEdit(t.id, 'description', t.description) }}
                            title="Doble click para editar"
                          >
                            {t.description}
                          </span>
                          {duplicates.has(t.id!) && <span className="shrink-0 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">dup</span>}
                          {!t.user_reviewed && t.assignment !== 'ambos' && <span className="shrink-0 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">auto</span>}
                          {!t.user_reviewed && t.assignment === 'ambos' && <span className="shrink-0 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">nuevo</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-900 whitespace-nowrap">
                      {editingCell?.id === t.id && editingCell?.field === 'amount_ars' ? (
                        <input
                          autoFocus
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null) }}
                          className="w-28 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className="cursor-text hover:bg-gray-100 px-1 rounded"
                          onDoubleClick={e => { e.stopPropagation(); t.id && t.amount_usd === 0 && startEdit(t.id, 'amount_ars', String(t.amount_ars)) }}
                        >
                          {t.amount_usd > 0 ? `USD ${t.amount_usd}` : formatAmount(t.amount_ars)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-500">
                      {t.installment_number ? `${t.installment_number}/${t.installment_total}` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <select
                        value={t.assignment}
                        onChange={e => t.id && update(t.id, 'assignment', e.target.value)}
                        className="text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {ASSIGNMENTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <select
                        value={t.category || ''}
                        onChange={e => t.id && update(t.id, 'category', e.target.value)}
                        className="text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-28"
                      >
                        <option value="">—</option>
                        {CATEGORIES.filter(c => c).map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={t.has_iva}
                        onChange={e => t.id && update(t.id, 'has_iva', e.target.checked)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => t.id && deleteTransaction(t.id)}
                        className="text-gray-300 hover:text-red-500 text-lg leading-none"
                        title="Eliminar"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function RevisionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>}>
      <RevisionContent />
    </Suspense>
  )
}
