import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Expense, Currency, ExpenseType, ExpenseCategory } from '../types';
import { CARDS, EXPENSE_TYPE_LABELS, CATEGORY_LABELS, EMPTY_EXPENSE } from '../constants';
import { computeAmountARS } from '../utils/calculations';
import { saveExpense } from '../db';

interface Props {
  monthKey: string;
  expense?: Expense;
  onClose: () => void;
  onSaved: () => void;
}

type EFormData = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>;

export default function ExpenseModal({ monthKey, expense, onClose, onSaved }: Props) {
  const isEdit = !!expense?.id;

  const [form, setForm] = useState<EFormData>(() => {
    if (expense) {
      const { id: _, createdAt: __, updatedAt: ___, ...rest } = expense;
      return rest;
    }
    return { ...EMPTY_EXPENSE, monthKey };
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Recalcula amountARS cuando cambia el importe, moneda, cotización o impuestos
  useEffect(() => {
    const computed = computeAmountARS(form.originalAmount, form.currency, form.exchangeRate, form.taxes);
    setForm((f: EFormData) => ({ ...f, amountARS: computed }));
  }, [form.originalAmount, form.currency, form.exchangeRate, form.taxes]);

  // Cuando cambia el owner, resetea la tarjeta al primero disponible
  const handleOwnerChange = (owner: 'fede' | 'meli') => {
    setForm((f: EFormData) => ({ ...f, owner, card: CARDS[owner][0] }));
  };

  const handleCurrencyChange = (currency: Currency) => {
    setForm((f: EFormData) => ({
      ...f,
      currency,
      exchangeRate: currency === 'ARS' ? 1 : f.exchangeRate || 1,
      taxes: currency === 'ARS' ? 0 : f.taxes,
    }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = 'La descripción es obligatoria';
    if (form.originalAmount <= 0) e.originalAmount = 'El importe debe ser mayor a 0';
    if (form.currency !== 'ARS' && form.exchangeRate <= 0) e.exchangeRate = 'Ingresá la cotización';
    if (!form.date) e.date = 'La fecha es obligatoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = expense?.id
        ? { ...form, id: expense.id, createdAt: expense.createdAt, updatedAt: now }
        : { ...form, createdAt: now, updatedAt: now };
      await saveExpense(payload);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof EFormData>(key: K, value: EFormData[K]) => {
    setForm((f: EFormData) => ({ ...f, [key]: value }));
    if (errors[key as string]) setErrors(er => { const n = { ...er }; delete n[key as string]; return n; });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-2xl my-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">
            {isEdit ? 'Editar movimiento' : 'Nuevo movimiento'}
          </h2>
          <button className="btn-ghost p-1 rounded" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* ─── Fila 1: Fecha + Descripción ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha *</label>
              <input
                type="date"
                className={`input ${errors.date ? 'border-red-400' : ''}`}
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="label">Descripción *</label>
              <input
                type="text"
                className={`input ${errors.description ? 'border-red-400' : ''}`}
                placeholder="Ej: Coto, Expensas, Edesur…"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                autoFocus
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            </div>
          </div>

          {/* ─── Fila 2: Propietario + Tarjeta ───────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Propietario</label>
              <div className="flex gap-2">
                {(['fede', 'meli'] as const).map(o => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => handleOwnerChange(o)}
                    className={`flex-1 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                      form.owner === o
                        ? o === 'fede'
                          ? 'bg-orange-100 border-orange-400 text-orange-800'
                          : 'bg-purple-100 border-purple-400 text-purple-800'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {o === 'fede' ? '🟠 Fede' : '🟣 Meli'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Tarjeta</label>
              <select
                className="select"
                value={form.card}
                onChange={e => set('card', e.target.value)}
              >
                {CARDS[form.owner].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ─── Fila 3: Moneda + Importe + Cotización + Impuestos ─────────── */}
          <div>
            <div className="flex gap-2 mb-2">
              {(['ARS', 'USD', 'EUR'] as Currency[]).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCurrencyChange(c)}
                  className={`px-3 py-1 rounded border text-xs font-mono font-semibold transition-colors ${
                    form.currency === c
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className={`grid gap-4 ${form.currency !== 'ARS' ? 'grid-cols-4' : 'grid-cols-2'}`}>
              <div className={form.currency !== 'ARS' ? '' : 'col-span-2'}>
                <label className="label">
                  Importe {form.currency !== 'ARS' ? `en ${form.currency}` : 'en ARS'} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`input font-mono ${errors.originalAmount ? 'border-red-400' : ''}`}
                  value={form.originalAmount || ''}
                  placeholder="0"
                  onChange={e => set('originalAmount', parseFloat(e.target.value) || 0)}
                />
                {errors.originalAmount && <p className="text-xs text-red-500 mt-1">{errors.originalAmount}</p>}
              </div>

              {form.currency !== 'ARS' && (
                <>
                  <div>
                    <label className="label">Cotización (ARS/{form.currency})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={`input font-mono ${errors.exchangeRate ? 'border-red-400' : ''}`}
                      value={form.exchangeRate || ''}
                      placeholder="0"
                      onChange={e => set('exchangeRate', parseFloat(e.target.value) || 0)}
                    />
                    {errors.exchangeRate && <p className="text-xs text-red-500 mt-1">{errors.exchangeRate}</p>}
                  </div>
                  <div>
                    <label className="label">Impuestos (ARS)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input font-mono"
                      value={form.taxes || ''}
                      placeholder="0"
                      onChange={e => set('taxes', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="label">Total en ARS</label>
                    <input
                      type="text"
                      readOnly
                      className="input font-mono bg-gray-50 text-gray-600 cursor-not-allowed"
                      value={form.amountARS > 0 ? form.amountARS.toLocaleString('es-AR', { maximumFractionDigits: 0 }) : ''}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ─── Fila 4: Cuotas ───────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Cuota actual (0 = sin cuotas)</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.installmentCurrent || ''}
                placeholder="0"
                onChange={e => set('installmentCurrent', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="label">Total de cuotas</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.installmentTotal || ''}
                placeholder="0"
                onChange={e => set('installmentTotal', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="label">IVA discriminado (ARS)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input font-mono"
                value={form.ivaAmount || ''}
                placeholder="0"
                onChange={e => set('ivaAmount', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* ─── Fila 5: Tipo + Categoría ─────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo *</label>
              <select
                className="select"
                value={form.type}
                onChange={e => set('type', e.target.value as ExpenseType)}
              >
                {(Object.entries(EXPENSE_TYPE_LABELS) as [ExpenseType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {TYPE_HINTS[form.type]}
              </p>
            </div>
            <div>
              <label className="label">Categoría</label>
              <select
                className="select"
                value={form.category}
                onChange={e => set('category', e.target.value as ExpenseCategory)}
              >
                {(Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ─── Fila 6: Notas + Referencia ───────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Notas internas</label>
              <input
                type="text"
                className="input"
                placeholder="Cualquier aclaración…"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Referencia / comprobante</label>
              <input
                type="text"
                className="input"
                placeholder="Link a Drive, N° de mail, descripción ticket…"
                value={form.evidenceRef}
                onChange={e => set('evidenceRef', e.target.value)}
              />
            </div>
          </div>

          {/* ─── Acciones ─────────────────────────────────────────────────── */}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Agregar movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const TYPE_HINTS: Record<ExpenseType, string> = {
  shared:        '÷ 2 entre Fede y Meli. Entra en la liquidación.',
  personal_fede: 'Solo de Fede. No se reparte.',
  personal_meli: 'Solo de Meli. No se reparte.',
  family_meli:   'Familia / mamá de Meli. NO entra en la liquidación familiar.',
  extraordinary: 'Gasto extraordinario del depto. Trato especial.',
  iva:           'IVA registrado por separado.',
  excluded:      'Excluido de la liquidación por otro motivo.',
};
