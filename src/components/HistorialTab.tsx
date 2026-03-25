import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { getAllMonths, getExpensesByMonth } from '../db';
import { calculateSettlement } from '../utils/calculations';
import { formatARS, formatMonthKey } from '../utils/formatters';
import type { MonthRecord } from '../types';

interface MonthSummary {
  record: MonthRecord;
  expenseCount: number;
  finalNet: number | null;
  sharedTotal: number;
}

interface Props {
  currentMonthKey: string;
  onSelectMonth: (key: string) => void;
}

export default function HistorialTab({ currentMonthKey, onSelectMonth }: Props) {
  const [summaries, setSummaries] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const months = await getAllMonths();
      const results = await Promise.all(
        months.map(async (m) => {
          const expenses = await getExpensesByMonth(m.monthKey);
          const settlement = calculateSettlement(expenses, m.previousDebt);
          return {
            record: m,
            expenseCount: expenses.length,
            finalNet: expenses.length > 0 ? settlement.finalNet : null,
            sharedTotal: settlement.sharedTotal,
          };
        })
      );
      setSummaries(results);
      setLoading(false);
    })();
  }, [currentMonthKey]);

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Cargando historial…</div>;
  }

  if (summaries.length === 0) {
    return (
      <div className="card p-12 text-center text-gray-400">
        No hay meses registrados todavía.
      </div>
    );
  }

  // Agrupar por año
  const byYear = summaries.reduce<Record<number, MonthSummary[]>>((acc, s) => {
    const y = s.record.year;
    if (!acc[y]) acc[y] = [];
    acc[y].push(s);
    return acc;
  }, {});

  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  return (
    <div className="space-y-8 max-w-4xl">
      {years.map(year => (
        <div key={year}>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{year}</h3>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="th">Mes</th>
                  <th className="th text-center">Estado</th>
                  <th className="th text-right">Movimientos</th>
                  <th className="th text-right">Compartidos</th>
                  <th className="th text-right">Liquidación</th>
                  <th className="th w-10"></th>
                </tr>
              </thead>
              <tbody>
                {byYear[year].map(({ record: m, expenseCount, finalNet, sharedTotal }) => {
                  const isCurrent = m.monthKey === currentMonthKey;
                  return (
                    <tr
                      key={m.monthKey}
                      className={`border-b border-gray-100 hover:bg-blue-50/40 cursor-pointer transition-colors ${isCurrent ? 'bg-blue-50/60' : ''}`}
                      onClick={() => onSelectMonth(m.monthKey)}
                    >
                      <td className="td font-medium">
                        {formatMonthKey(m.monthKey)}
                        {isCurrent && (
                          <span className="ml-2 badge bg-blue-100 text-blue-700 border-blue-200">actual</span>
                        )}
                      </td>
                      <td className="td text-center">
                        {m.status === 'closed'
                          ? <span className="badge bg-green-50 text-green-700 border-green-200">✓ Cerrado</span>
                          : <span className="badge bg-amber-50 text-amber-700 border-amber-200">Abierto</span>}
                      </td>
                      <td className="td text-right text-gray-600">{expenseCount}</td>
                      <td className="td text-right font-mono">
                        {sharedTotal > 0 ? formatARS(sharedTotal) : '—'}
                      </td>
                      <td className="td text-right font-mono font-semibold">
                        {finalNet !== null ? (
                          <span className={finalNet >= 0 ? 'text-orange-700' : 'text-purple-700'}>
                            {finalNet >= 0
                              ? `M→F ${formatARS(finalNet)}`
                              : `F→M ${formatARS(Math.abs(finalNet))}`}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="td text-gray-400">
                        <ChevronRight size={14} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* ─── Totales históricos ─────────────────────────────────────────────── */}
      <HistoricalTotals summaries={summaries} />
    </div>
  );
}

function HistoricalTotals({ summaries }: { summaries: MonthSummary[] }) {
  const totalMonths = summaries.filter(s => s.expenseCount > 0).length;
  const totalShared = summaries.reduce((a, s) => a + s.sharedTotal, 0);
  const totalTransfers = summaries
    .filter(s => s.finalNet !== null)
    .reduce((a, s) => a + Math.abs(s.finalNet!), 0);
  const avgShared = totalMonths > 0 ? totalShared / totalMonths : 0;

  return (
    <div className="card p-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
        Totales históricos ({totalMonths} meses registrados)
      </h3>
      <div className="grid grid-cols-3 gap-6">
        <div>
          <p className="text-xs text-gray-500 mb-1">Total compartidos acumulado</p>
          <p className="text-lg font-bold font-mono text-gray-800">{formatARS(totalShared)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Promedio mensual compartidos</p>
          <p className="text-lg font-bold font-mono text-gray-800">{formatARS(avgShared)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Total transferencias acumuladas</p>
          <p className="text-lg font-bold font-mono text-gray-800">{formatARS(totalTransfers)}</p>
        </div>
      </div>
    </div>
  );
}
