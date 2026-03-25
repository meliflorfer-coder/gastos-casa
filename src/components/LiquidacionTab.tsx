import { useState } from 'react';
import { CheckCircle, RotateCcw, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { Expense, MonthRecord, Settlement, ExpenseType } from '../types';
import { EXPENSE_TYPE_LABELS } from '../constants';
import { formatARS, formatMonthKey } from '../utils/formatters';
import { updateMonthRecord } from '../db';

interface Props {
  monthKey: string;
  month: MonthRecord;
  expenses: Expense[];
  settlement: Settlement | null;
  onRefresh: () => void;
}

export default function LiquidacionTab({ monthKey, month, expenses, settlement, onRefresh }: Props) {
  const [previousDebt, setPreviousDebt] = useState(month.previousDebt);
  const [savingDebt, setSavingDebt] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [notes, setNotes] = useState(month.notes);

  if (!settlement) return null;

  const s = settlement;
  const isClosing = month.status === 'closed';

  const handleUpdateDebt = async () => {
    setSavingDebt(true);
    await updateMonthRecord(monthKey, { previousDebt });
    await onRefresh();
    setSavingDebt(false);
  };

  const handleCloseMonth = async () => {
    setClosing(true);
    await updateMonthRecord(monthKey, {
      status: 'closed',
      closedAt: new Date().toISOString(),
      notes,
    });
    onRefresh();
    setClosing(false);
    setConfirmClose(false);
  };

  const handleReopenMonth = async () => {
    await updateMonthRecord(monthKey, { status: 'open', closedAt: '' });
    onRefresh();
  };

  const expensesByType = (type: ExpenseType) =>
    expenses.filter(e => e.type === type);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ─── Estado del mes ─────────────────────────────────────────────────── */}
      <div className={`card p-4 flex items-center gap-3 ${isClosing ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
        {isClosing
          ? <CheckCircle className="text-green-600 shrink-0" size={20} />
          : <AlertTriangle className="text-blue-600 shrink-0" size={20} />}
        <div className="flex-1">
          <p className={`font-semibold ${isClosing ? 'text-green-800' : 'text-blue-800'}`}>
            {isClosing
              ? `Mes cerrado el ${new Date(month.closedAt).toLocaleDateString('es-AR')}`
              : 'Mes abierto — en curso'}
          </p>
          <p className={`text-sm ${isClosing ? 'text-green-700' : 'text-blue-700'}`}>
            {isClosing
              ? 'Los movimientos están bloqueados. Podés reabrirlo si necesitás corregir algo.'
              : 'Revisá los movimientos y cerrá el mes cuando esté todo correcto.'}
          </p>
        </div>
        {isClosing
          ? <button className="btn-secondary shrink-0" onClick={handleReopenMonth}><RotateCcw size={14} /> Reabrir</button>
          : <button className="btn-primary shrink-0" onClick={() => setConfirmClose(true)}><CheckCircle size={14} /> Cerrar mes</button>}
      </div>

      {/* ─── Deuda anterior ─────────────────────────────────────────────────── */}
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-gray-700">Deuda arrastrada del mes anterior</h3>
        <p className="text-xs text-gray-500">
          Positivo = Meli le debe a Fede. Negativo = Fede le debe a Meli.
        </p>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="label">Importe (ARS)</label>
            <input
              type="number"
              step="0.01"
              className="input font-mono"
              value={previousDebt}
              onChange={e => setPreviousDebt(parseFloat(e.target.value) || 0)}
              readOnly={isClosing}
            />
          </div>
          {!isClosing && (
            <button className="btn-secondary" onClick={handleUpdateDebt} disabled={savingDebt}>
              {savingDebt ? 'Guardando…' : 'Aplicar'}
            </button>
          )}
        </div>
      </div>

      {/* ─── Liquidación del mes ─────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Liquidación — {formatMonthKey(monthKey)}</h3>
        </div>

        <div className="p-5 space-y-5">
          {/* Gastos compartidos */}
          <Section title="Gastos compartidos (÷ 2)">
            <div className="grid grid-cols-2 gap-4">
              <PersonSide label="🟠 Fede pagó" amount={s.fedePaidShared} />
              <PersonSide label="🟣 Meli pagó" amount={s.meliPaidShared} />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
              <Stat label="Total compartido" value={formatARS(s.sharedTotal)} />
              <Stat label="Cada uno aporta" value={formatARS(s.sharedPerPerson)} accent />
              <div>
                <p className="text-xs text-gray-500 mb-1">Diferencia Fede</p>
                <BalanceBadge amount={s.fedeBalance} />
              </div>
            </div>
          </Section>

          {/* Personales */}
          {(s.fedePersonal > 0 || s.meliPersonal > 0) && (
            <Section title="Gastos personales (informativos — no se reparten)">
              <div className="grid grid-cols-2 gap-4">
                <PersonSide label="🟠 Fede personal" amount={s.fedePersonal} dimmed />
                <PersonSide label="🟣 Meli personal" amount={s.meliPersonal} dimmed />
              </div>
            </Section>
          )}

          {/* Excluidos */}
          {(s.familyMeli > 0 || s.otherExcluded > 0) && (
            <Section title="Excluidos de la liquidación">
              <div className="grid grid-cols-2 gap-4">
                {s.familyMeli > 0 && <PersonSide label="👨‍👩‍👦 Familia Meli" amount={s.familyMeli} dimmed />}
                {s.otherExcluded > 0 && <PersonSide label="⛔ Otros excluidos" amount={s.otherExcluded} dimmed />}
              </div>
            </Section>
          )}

          {/* IVA */}
          {s.ivaTotal > 0 && (
            <Section title="IVA registrado (informativo)">
              <p className="font-mono text-green-700 font-semibold">{formatARS(s.ivaTotal)}</p>
            </Section>
          )}

          {/* Resumen por tipo (detalle) */}
          <Section title="Detalle por tipo de gasto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left py-1">Tipo</th>
                  <th className="text-right py-1">Fede</th>
                  <th className="text-right py-1">Meli</th>
                  <th className="text-right py-1">Total</th>
                  <th className="text-right py-1">Cant.</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(EXPENSE_TYPE_LABELS) as ExpenseType[]).map(type => {
                  const items = expensesByType(type);
                  if (items.length === 0) return null;
                  const fedeAmt = items.filter(e => e.owner === 'fede').reduce((s, e) => s + e.amountARS, 0);
                  const meliAmt = items.filter(e => e.owner === 'meli').reduce((s, e) => s + e.amountARS, 0);
                  return (
                    <tr key={type} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 font-medium">{EXPENSE_TYPE_LABELS[type]}</td>
                      <td className="py-1.5 text-right font-mono text-orange-700">{fedeAmt > 0 ? formatARS(fedeAmt) : '—'}</td>
                      <td className="py-1.5 text-right font-mono text-purple-700">{meliAmt > 0 ? formatARS(meliAmt) : '—'}</td>
                      <td className="py-1.5 text-right font-mono font-semibold">{formatARS(fedeAmt + meliAmt)}</td>
                      <td className="py-1.5 text-right text-gray-400">{items.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>

          {/* ─── Resultado final ──────────────────────────────────────────── */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-5 space-y-3">
            <h4 className="font-semibold text-blue-800 text-sm">Resultado del mes</h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Transferencia por compartidos</span>
                <span className="font-mono font-semibold">
                  {s.netTransfer >= 0 ? `Meli → Fede ${formatARS(s.netTransfer)}` : `Fede → Meli ${formatARS(Math.abs(s.netTransfer))}`}
                </span>
              </div>
              {s.previousDebt !== 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>+ Deuda mes anterior</span>
                  <span className="font-mono">{formatARS(s.previousDebt)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                <span className="font-semibold text-blue-800 text-base">TOTAL A TRANSFERIR</span>
                <div className="flex items-center gap-2">
                  {s.finalNet >= 0
                    ? <TrendingUp className="text-orange-500" size={18} />
                    : <TrendingDown className="text-purple-500" size={18} />}
                  <span className="font-bold text-xl text-blue-900">
                    {formatARS(Math.abs(s.finalNet))}
                  </span>
                </div>
              </div>
              <p className="text-center text-sm font-medium text-blue-700">
                {s.finalNet >= 0
                  ? `🟣 Meli transfiere ${formatARS(Math.abs(s.finalNet))} a 🟠 Fede`
                  : `🟠 Fede transfiere ${formatARS(Math.abs(s.finalNet))} a 🟣 Meli`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Notas del mes ─────────────────────────────────────────────────── */}
      <div className="card p-4 space-y-2">
        <label className="label">Notas del mes (opcional)</label>
        <textarea
          className="input resize-none"
          rows={3}
          placeholder="Observaciones, aclaraciones, contexto del cierre…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          readOnly={isClosing}
        />
        {!isClosing && (
          <button
            className="btn-secondary text-xs"
            onClick={async () => { await updateMonthRecord(monthKey, { notes }); onRefresh(); }}
          >
            Guardar notas
          </button>
        )}
        {month.notes && isClosing && (
          <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">{month.notes}</p>
        )}
      </div>

      {/* ─── Modal confirmación cierre ──────────────────────────────────────── */}
      {confirmClose && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full space-y-4">
            <h3 className="font-semibold">¿Cerrar {formatMonthKey(monthKey)}?</h3>
            <p className="text-sm text-gray-600">
              Al cerrar el mes los movimientos quedan bloqueados y se registra el resultado de la liquidación.
              Podés reabrirlo después si hace falta.
            </p>
            <div className="bg-blue-50 rounded p-3 text-sm font-medium text-blue-800">
              {s.finalNet >= 0
                ? `Meli → Fede: ${formatARS(s.finalNet)}`
                : `Fede → Meli: ${formatARS(Math.abs(s.finalNet))}`}
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setConfirmClose(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCloseMonth} disabled={closing}>
                {closing ? 'Cerrando…' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  );
}

function PersonSide({ label, amount, dimmed }: { label: string; amount: number; dimmed?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${dimmed ? 'bg-gray-50' : 'bg-white border border-gray-200'}`}>
      <p className={`text-xs ${dimmed ? 'text-gray-400' : 'text-gray-500'} mb-1`}>{label}</p>
      <p className={`text-lg font-bold font-mono ${dimmed ? 'text-gray-400' : 'text-gray-800'}`}>
        {formatARS(amount)}
      </p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-bold font-mono text-base ${accent ? 'text-blue-700' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

function BalanceBadge({ amount }: { amount: number }) {
  if (Math.abs(amount) < 0.01) {
    return <span className="badge bg-green-50 text-green-700 border-green-200">Equilibrado</span>;
  }
  if (amount > 0) {
    return (
      <div>
        <span className="badge bg-orange-50 text-orange-700 border-orange-200">Fede pagó {formatARS(amount)} de más</span>
        <p className="text-xs text-gray-500 mt-1">Meli reembolsa esta diferencia</p>
      </div>
    );
  }
  return (
    <div>
      <span className="badge bg-purple-50 text-purple-700 border-purple-200">Meli pagó {formatARS(Math.abs(amount))} de más</span>
      <p className="text-xs text-gray-500 mt-1">Fede reembolsa esta diferencia</p>
    </div>
  );
}
