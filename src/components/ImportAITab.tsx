import { useState, useRef, useCallback } from 'react';
import { Upload, Sparkles, Check, X, AlertTriangle, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeDocumentWithGemini, type GeminiExpense, type GeminiResult } from '../utils/gemini';
import { bulkImportExpenses, supabase } from '../db';
import { EXPENSE_TYPE_LABELS, CATEGORY_LABELS, EXPENSE_TYPE_COLORS } from '../constants';
import { formatARS } from '../utils/formatters';
import type { ExpenseCategory, ExpenseType, Owner } from '../types';

interface Props {
  monthKey: string;
  onRefresh: () => void;
}

type Status = 'idle' | 'analyzing' | 'review' | 'importing' | 'done' | 'error';

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv,.txt';
const DOC_TYPE_LABELS: Record<string, string> = {
  resumen_tarjeta: '💳 Resumen de tarjeta',
  factura:         '🧾 Factura',
  ticket:          '🧾 Ticket',
  extracto_banco:  '🏦 Extracto bancario',
  excel:           '📊 Excel / CSV',
  otro:            '📄 Documento',
};

export default function ImportAITab({ monthKey, onRefresh }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<GeminiResult | null>(null);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [rows, setRows] = useState<GeminiExpense[]>([]);
  const [saveInvoice, setSaveInvoice] = useState(false);
  const [imported, setImported] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setStatus('analyzing');
    setError('');
    setResult(null);
    try {
      const res = await analyzeDocumentWithGemini(file, monthKey);
      setResult(res);
      setRows(res.expenses);
      setSelected(res.expenses.map(() => true));
      setSaveInvoice(res.isInvoice);
      setStatus('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [monthKey]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const toggleAll = (val: boolean) => setSelected(rows.map(() => val));
  const toggleRow = (i: number) => setSelected(s => s.map((v, idx) => idx === i ? !v : v));

  const updateRow = (i: number, field: keyof GeminiExpense, value: unknown) => {
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const handleImport = async () => {
    if (!result) return;
    setStatus('importing');

    const toImport = rows
      .filter((_, i) => selected[i])
      .map(e => ({
        monthKey,
        date: e.date,
        description: e.description,
        category: e.category,
        type: e.type,
        owner: 'meli' as Owner, // default — editable antes de importar
        card: e.card,
        installmentCurrent: e.installmentCurrent,
        installmentTotal: e.installmentTotal,
        currency: e.currency,
        originalAmount: e.originalAmount,
        exchangeRate: e.exchangeRate,
        taxes: e.taxes,
        amountARS: e.amountARS,
        ivaAmount: e.ivaAmount,
        ivaTracked: e.ivaTracked,
        notes: e.notes,
        evidenceRef: '',
      }));

    const count = await bulkImportExpenses(toImport);

    // Si es factura y el usuario quiere guardar el doc IVA
    if (saveInvoice && result.isInvoice && result.invoiceIvaAmount > 0) {
      await supabase.from('iva_documents').insert({
        month: monthKey,
        filename: result.rawSummary,
        source: 'gemini',
        iva_amount: result.invoiceIvaAmount,
        notes: result.invoiceNotes,
      });
    }

    setImported(count);
    setStatus('done');
    onRefresh();
  };

  const reset = () => {
    setStatus('idle');
    setResult(null);
    setRows([]);
    setSelected([]);
    setError('');
    setImported(0);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (status === 'done') {
    return (
      <div className="card p-8 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="text-green-600" size={24} />
        </div>
        <p className="font-semibold text-gray-800">
          {imported} {imported === 1 ? 'gasto importado' : 'gastos importados'} correctamente
        </p>
        {saveInvoice && result?.isInvoice && (
          <p className="text-sm text-green-600">+ Factura IVA guardada ({formatARS(result.invoiceIvaAmount)})</p>
        )}
        <button className="btn-primary" onClick={reset}>Importar otro documento</button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="card p-6 max-w-lg mx-auto space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-red-700">Error al analizar el documento</p>
            <p className="text-sm text-red-600 mt-1 font-mono whitespace-pre-wrap">{error}</p>
          </div>
        </div>
        <button className="btn-secondary" onClick={reset}>Intentar de nuevo</button>
      </div>
    );
  }

  if (status === 'analyzing') {
    return (
      <div className="card p-12 text-center space-y-4 max-w-lg mx-auto">
        <Loader2 className="animate-spin text-blue-500 mx-auto" size={32} />
        <p className="font-medium text-gray-700">Analizando documento con Gemini…</p>
        <p className="text-sm text-gray-400">Esto puede tardar unos segundos</p>
      </div>
    );
  }

  if (status === 'review' && result) {
    const selectedCount = selected.filter(Boolean).length;
    const totalARS = rows
      .filter((_, i) => selected[i])
      .reduce((s, e) => s + e.amountARS, 0);

    return (
      <div className="space-y-4 max-w-6xl">
        {/* Header del resultado */}
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <Sparkles className="text-blue-600" size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800">
              {DOC_TYPE_LABELS[result.documentType] ?? '📄 Documento'}
            </p>
            <p className="text-sm text-gray-500 truncate">{result.rawSummary}</p>
          </div>
          <button onClick={reset} className="btn-ghost p-1.5 rounded text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Alerta de factura IVA */}
        {result.isInvoice && result.invoiceIvaAmount > 0 && (
          <div className="card p-4 bg-green-50 border-green-200 flex items-start gap-3">
            <div className="text-green-600 shrink-0 mt-0.5">🧾</div>
            <div className="flex-1">
              <p className="font-semibold text-green-800 text-sm">Factura con IVA discriminado detectada</p>
              <p className="text-sm text-green-700">
                IVA: <strong>{formatARS(result.invoiceIvaAmount)}</strong>
                {result.invoiceNotes && <span className="ml-2 text-green-600">— {result.invoiceNotes}</span>}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-green-800 cursor-pointer">
              <input
                type="checkbox"
                checked={saveInvoice}
                onChange={e => setSaveInvoice(e.target.checked)}
                className="rounded"
              />
              Guardar en IVA
            </label>
          </div>
        )}

        {/* Tabla de revisión */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCount === rows.length}
                  onChange={e => toggleAll(e.target.checked)}
                  className="rounded"
                />
                Seleccionar todos
              </label>
              <span className="text-xs text-gray-400">
                {selectedCount} de {rows.length} seleccionados · {formatARS(totalARS)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="th w-8"></th>
                  <th className="th">Fecha</th>
                  <th className="th">Descripción</th>
                  <th className="th">Categoría</th>
                  <th className="th">Tipo</th>
                  <th className="th">Tarjeta</th>
                  <th className="th text-right">Importe ARS</th>
                  <th className="th text-center">Cuotas</th>
                  <th className="th text-center">IVA</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e, i) => (
                  <ReviewRow
                    key={i}
                    expense={e}
                    selected={selected[i]}
                    onToggle={() => toggleRow(i)}
                    onChange={(field, val) => updateRow(i, field, val)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aviso de owner */}
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <AlertTriangle size={12} />
          Todos los gastos se importan con propietario "Meli" por defecto. Podés editarlos después en Movimientos.
        </p>

        {/* Botones */}
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={reset}>Cancelar</button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleImport}
            disabled={selectedCount === 0 || status === 'importing'}
          >
            <Check size={16} />
            Importar {selectedCount} {selectedCount === 1 ? 'gasto' : 'gastos'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Drop zone (idle) ────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`
          card border-2 border-dashed p-12 text-center cursor-pointer transition-colors
          ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
        `}
      >
        <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={onFileInput} />
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="text-blue-500" size={26} />
        </div>
        <p className="font-semibold text-gray-800 mb-1">Importar con Gemini IA</p>
        <p className="text-sm text-gray-500 mb-4">
          Arrastrá o hacé click para subir un archivo
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {['PDF', 'JPG / PNG', 'Excel', 'CSV'].map(t => (
            <span key={t} className="badge bg-gray-100 text-gray-600 border-gray-200">
              <FileText size={11} className="inline mr-1" />{t}
            </span>
          ))}
        </div>
      </div>

      <div className="card p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Qué podés subir</p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>📋 <strong>Resúmenes de tarjeta</strong> — detecta todas las transacciones automáticamente</li>
          <li>🏦 <strong>Extractos bancarios</strong> — importa todos los movimientos del período</li>
          <li>🧾 <strong>Facturas</strong> — extrae el IVA discriminado y lo guarda en la tabla IVA</li>
          <li>🧾 <strong>Tickets</strong> — carga el gasto con la categoría inferida</li>
          <li>📊 <strong>Excel / CSV</strong> — tablas de gastos propias</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Fila editable de revisión ────────────────────────────────────────────────

function ReviewRow({
  expense: e,
  selected,
  onToggle,
  onChange,
}: {
  expense: GeminiExpense;
  selected: boolean;
  onToggle: () => void;
  onChange: (field: keyof GeminiExpense, val: unknown) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className={`border-b border-gray-100 transition-colors ${selected ? '' : 'opacity-40'}`}>
        <td className="td">
          <input type="checkbox" checked={selected} onChange={onToggle} className="rounded" />
        </td>
        <td className="td">
          <input
            type="date"
            value={e.date}
            onChange={ev => onChange('date', ev.target.value)}
            className="input py-0.5 px-1.5 text-xs w-32"
          />
        </td>
        <td className="td max-w-xs">
          <input
            value={e.description}
            onChange={ev => onChange('description', ev.target.value)}
            className="input py-0.5 px-1.5 text-xs w-full"
          />
        </td>
        <td className="td">
          <select
            value={e.category}
            onChange={ev => onChange('category', ev.target.value as ExpenseCategory)}
            className="input py-0.5 px-1.5 text-xs"
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </td>
        <td className="td">
          <select
            value={e.type}
            onChange={ev => onChange('type', ev.target.value as ExpenseType)}
            className="input py-0.5 px-1.5 text-xs"
          >
            {Object.entries(EXPENSE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </td>
        <td className="td">
          <input
            value={e.card}
            onChange={ev => onChange('card', ev.target.value)}
            className="input py-0.5 px-1.5 text-xs w-28"
            placeholder="—"
          />
        </td>
        <td className="td text-right font-mono font-semibold">
          {formatARS(e.amountARS)}
        </td>
        <td className="td text-center text-xs text-gray-500">
          {e.installmentTotal > 1 ? `${e.installmentCurrent}/${e.installmentTotal}` : '—'}
        </td>
        <td className="td text-center">
          <label className="flex items-center justify-center gap-1 cursor-pointer" title="Tiene factura con IVA">
            <input
              type="checkbox"
              checked={e.ivaTracked}
              onChange={ev => onChange('ivaTracked', ev.target.checked)}
              className="rounded"
            />
            {e.ivaAmount > 0 && (
              <span className="text-xs text-green-600 font-mono">{formatARS(e.ivaAmount)}</span>
            )}
          </label>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50 border-b border-gray-100">
          <td colSpan={9} className="px-4 py-2">
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div>
                <label className="label text-xs">Moneda</label>
                <select value={e.currency} onChange={ev => onChange('currency', ev.target.value)} className="input py-0.5 text-xs">
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Importe original</label>
                <input type="number" value={e.originalAmount} onChange={ev => onChange('originalAmount', parseFloat(ev.target.value))} className="input py-0.5 text-xs" />
              </div>
              <div>
                <label className="label text-xs">Tipo de cambio</label>
                <input type="number" value={e.exchangeRate} onChange={ev => onChange('exchangeRate', parseFloat(ev.target.value))} className="input py-0.5 text-xs" />
              </div>
              <div>
                <label className="label text-xs">Notas</label>
                <input value={e.notes} onChange={ev => onChange('notes', ev.target.value)} className="input py-0.5 text-xs" />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
