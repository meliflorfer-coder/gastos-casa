import { useState, useMemo } from 'react';
import { Plus, Filter, X, AlertTriangle } from 'lucide-react';
import type { Expense, MonthRecord, Settlement, ExpenseType, Owner } from '../types';
import {
  EXPENSE_TYPE_LABELS, EXPENSE_TYPE_COLORS, EXPENSE_TYPE_ROW_COLORS,
  CATEGORY_LABELS,
} from '../constants';
import { formatARS, formatDate, formatInstallment } from '../utils/formatters';
import ExpenseModal from './ExpenseModal';
import { deleteExpense } from '../db';

interface Props {
  monthKey: string;
  month: MonthRecord;
  expenses: Expense[];
  settlement: Settlement | null;
  onRefresh: () => void;
}

type FilterType = ExpenseType | 'all';
type FilterOwner = Owner | 'all';

export default function MovimientosTab({ monthKey, month, expenses, settlement, onRefresh }: Props) {
  const [modal, setModal] = useState<{ open: boolean; expense?: Expense }>({ open: false });
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterOwner, setFilterOwner] = useState<FilterOwner>('all');
  const [filterText, setFilterText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (filterType !== 'all' && e.type !== filterType) return false;
      if (filterOwner !== 'all' && e.owner !== filterOwner) return false;
      if (filterText) {
        const q = filterText.toLowerCase();
        if (!e.description.toLowerCase().includes(q) && !e.card.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [expenses, filterType, filterOwner, filterText]);

  const hasFilters = filterType !== 'all' || filterOwner !== 'all' || filterText;

  const handleDelete = async (id: number) => {
    await deleteExpense(id);
    setConfirmDelete(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* ─── Barra superior ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn-primary"
          onClick={() => setModal({ open: true })}
          disabled={month.status === 'closed'}
          title={month.status === 'closed' ? 'El mes está cerrado' : 'Agregar movimiento'}
        >
          <Plus size={16} />
          Agregar
        </button>

        {month.status === 'closed' && (
          <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            <AlertTriangle size={13} />
            Mes cerrado — reabrilo desde la pestaña Liquidación para editar
          </span>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <div className="relative">
            <input
              className="input pl-7 w-44"
              placeholder="Buscar…"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
            <Filter size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
          </div>

          <select
            className="select w-36"
            value={filterOwner}
            onChange={e => setFilterOwner(e.target.value as FilterOwner)}
          >
            <option value="all">Todos</option>
            <option value="fede">Fede</option>
            <option value="meli">Meli</option>
          </select>

          <select
            className="select w-44"
            value={filterType}
            onChange={e => setFilterType(e.target.value as FilterType)}
          >
            <option value="all">Todos los tipos</option>
            {(Object.keys(EXPENSE_TYPE_LABELS) as ExpenseType[]).map(t => (
              <option key={t} value={t}>{EXPENSE_TYPE_LABELS[t]}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              className="btn-ghost text-xs"
              onClick={() => { setFilterType('all'); setFilterOwner('all'); setFilterText(''); }}
            >
              <X size={13} />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ─── Tabla ─────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          {expenses.length === 0
            ? 'Todavía no hay movimientos este mes. Hacé clic en "Agregar" para empezar.'
            : 'Ningún movimiento coincide con los filtros aplicados.'}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto thin-scroll">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="th w-14">Fecha</th>
                  <th className="th">Descripción</th>
                  <th className="th">Tarjeta</th>
                  <th className="th w-16">Cuota</th>
                  <th className="th w-28 text-right">Importe</th>
                  <th className="th w-24 text-right">En ARS</th>
                  <th className="th w-32">Tipo</th>
                  <th className="th w-28">Categoría</th>
                  <th className="th w-16 text-center">Acc.</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    onEdit={() => setModal({ open: true, expense: e })}
                    onDelete={() => setConfirmDelete(e.id!)}
                    readOnly={month.status === 'closed'}
                  />
                ))}
              </tbody>
              <tfoot>
                <TotalsRow expenses={filtered} />
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─── Resumen rápido (panel lateral compacto) ────────────────────────── */}
      {settlement && expenses.length > 0 && (
        <QuickSummary settlement={settlement} />
      )}

      {/* ─── Modal agregar/editar ───────────────────────────────────────────── */}
      {modal.open && (
        <ExpenseModal
          monthKey={monthKey}
          expense={modal.expense}
          onClose={() => setModal({ open: false })}
          onSaved={() => { setModal({ open: false }); onRefresh(); }}
        />
      )}

      {/* ─── Confirmar eliminación ──────────────────────────────────────────── */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full space-y-4">
            <p className="font-medium">¿Eliminar este movimiento?</p>
            <p className="text-sm text-gray-500">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fila de gasto ────────────────────────────────────────────────────────────
function ExpenseRow({
  expense: e,
  onEdit,
  onDelete,
  readOnly,
}: {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
  readOnly: boolean;
}) {
  const isExcluded = e.type === 'excluded' || e.type === 'family_meli';

  return (
    <tr className={`border-b border-gray-100 hover:brightness-95 transition-colors ${EXPENSE_TYPE_ROW_COLORS[e.type]}`}>
      {/* Fecha */}
      <td className="td font-mono text-gray-500">{formatDate(e.date)}</td>

      {/* Descripción */}
      <td className="td">
        <div className="flex flex-col min-w-0">
          <span className={`font-medium truncate max-w-xs ${isExcluded ? 'line-through text-gray-400' : ''}`}>
            {e.description}
          </span>
          {e.evidenceRef && (
            <span className="text-xs text-blue-500 truncate max-w-xs">
              {e.evidenceRef.startsWith('http')
                ? <a href={e.evidenceRef} target="_blank" rel="noreferrer" className="underline">Ver doc</a>
                : e.evidenceRef}
            </span>
          )}
          {e.notes && <span className="text-xs text-gray-400 truncate max-w-xs">{e.notes}</span>}
        </div>
      </td>

      {/* Tarjeta */}
      <td className="td whitespace-nowrap">
        <div className="flex flex-col">
          <span className="font-medium capitalize">{e.owner}</span>
          <span className="text-xs text-gray-400">{e.card}</span>
        </div>
      </td>

      {/* Cuota */}
      <td className="td text-center font-mono text-xs text-gray-500">
        {formatInstallment(e.installmentCurrent, e.installmentTotal)}
      </td>

      {/* Importe original */}
      <td className="td text-right whitespace-nowrap">
        {e.currency !== 'ARS' ? (
          <div className="flex flex-col items-end">
            <span className="font-medium">
              {e.currency === 'USD' ? 'USD' : '€'} {e.originalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
            {e.exchangeRate > 1 && (
              <span className="text-xs text-gray-400">@{e.exchangeRate.toLocaleString('es-AR')}</span>
            )}
          </div>
        ) : (
          <span className={isExcluded ? 'text-gray-400' : ''}>{formatARS(e.amountARS)}</span>
        )}
      </td>

      {/* Total ARS */}
      <td className="td text-right whitespace-nowrap font-medium">
        {e.currency !== 'ARS' ? (
          <span className={isExcluded ? 'text-gray-400' : ''}>{formatARS(e.amountARS)}</span>
        ) : '—'}
      </td>

      {/* Tipo */}
      <td className="td">
        <span className={`badge ${EXPENSE_TYPE_COLORS[e.type]}`}>
          {EXPENSE_TYPE_LABELS[e.type]}
        </span>
      </td>

      {/* Categoría */}
      <td className="td text-xs text-gray-500 whitespace-nowrap">
        {CATEGORY_LABELS[e.category]}
      </td>

      {/* Acciones */}
      <td className="td text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={onEdit}
            disabled={readOnly}
            className="p-1 rounded hover:bg-white/80 text-gray-500 hover:text-blue-600 disabled:opacity-30 transition-colors"
            title="Editar"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            disabled={readOnly}
            className="p-1 rounded hover:bg-white/80 text-gray-500 hover:text-red-600 disabled:opacity-30 transition-colors"
            title="Eliminar"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Fila de totales ─────────────────────────────────────────────────────────
function TotalsRow({ expenses }: { expenses: Expense[] }) {
  const totalARS = expenses
    .filter(e => e.type !== 'excluded' && e.type !== 'family_meli')
    .reduce((s, e) => s + e.amountARS, 0);
  const totalExcluded = expenses
    .filter(e => e.type === 'excluded' || e.type === 'family_meli')
    .reduce((s, e) => s + e.amountARS, 0);

  return (
    <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
      <td className="td text-xs text-gray-500" colSpan={4}>
        {expenses.length} movimientos
      </td>
      <td className="td text-right text-gray-800" colSpan={2}>
        {formatARS(totalARS)}
      </td>
      <td className="td text-xs text-gray-400" colSpan={3}>
        {totalExcluded > 0 && `(+ ${formatARS(totalExcluded)} excluido)`}
      </td>
    </tr>
  );
}

// ─── Resumen rápido ───────────────────────────────────────────────────────────
function QuickSummary({ settlement: s }: { settlement: Settlement }) {
  const transferDir = s.finalNet >= 0
    ? `Meli → Fede: ${formatARS(Math.abs(s.finalNet))}`
    : `Fede → Meli: ${formatARS(Math.abs(s.finalNet))}`;

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resumen del mes</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryItem label="Compartidos" value={formatARS(s.sharedTotal)} />
        <SummaryItem label="Cada uno aporta" value={formatARS(s.sharedPerPerson)} accent />
        <SummaryItem
          label="Fede pagó"
          value={formatARS(s.fedePaidShared)}
          sub={s.fedeBalance > 0 ? `+${formatARS(s.fedeBalance)}` : formatARS(s.fedeBalance)}
        />
        <SummaryItem
          label="Meli pagó"
          value={formatARS(s.meliPaidShared)}
          sub={s.meliBalance > 0 ? `+${formatARS(s.meliBalance)}` : formatARS(s.meliBalance)}
        />
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {s.previousDebt !== 0 && (
            <>Deuda anterior: <strong>{formatARS(s.previousDebt)}</strong> · </>
          )}
          Transferencia neta:
        </span>
        <span className="font-bold text-base text-blue-700">{transferDir}</span>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-semibold ${accent ? 'text-blue-700' : 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
