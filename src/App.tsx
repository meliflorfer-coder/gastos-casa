import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { getOrCreateMonth, getExpensesByMonth } from './db';
import { calculateSettlement, currentMonthKey, nextMonth, prevMonth } from './utils/calculations';
import { formatMonthKey } from './utils/formatters';
import type { Expense, MonthRecord, Settlement } from './types';

import MovimientosTab from './components/MovimientosTab';
import LiquidacionTab from './components/LiquidacionTab';
import HistorialTab from './components/HistorialTab';
import ImportExportTab from './components/ImportExportTab';

type Tab = 'movimientos' | 'liquidacion' | 'historial' | 'datos';

export default function App() {
  const [monthKey, setMonthKey] = useState<string>(currentMonthKey);
  const [tab, setTab] = useState<Tab>('movimientos');
  const [month, setMonth] = useState<MonthRecord | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlement, setSettlement] = useState<Settlement | null>(null);

  // Carga el registro del mes y sus gastos
  const loadMonth = useCallback(async (key: string) => {
    const m = await getOrCreateMonth(key);
    const exps = await getExpensesByMonth(key);
    setMonth(m);
    setExpenses(exps);
    setSettlement(calculateSettlement(exps, m.previousDebt));
  }, []);

  useEffect(() => {
    loadMonth(monthKey);
  }, [monthKey, loadMonth]);

  // Recarga cuando cambian gastos en la DB (post add/edit/delete)
  const refresh = useCallback(() => loadMonth(monthKey), [monthKey, loadMonth]);

  const goToCurrent = () => setMonthKey(currentMonthKey());

  const isCurrent = monthKey === currentMonthKey();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Logo / título */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">🏠</span>
            <span className="font-semibold text-gray-800 hidden sm:block">Gastos Casa</span>
          </div>

          {/* Navegación de mes */}
          <div className="flex items-center gap-1 ml-auto sm:ml-0 sm:mx-auto">
            <button
              onClick={() => setMonthKey(k => prevMonth(k))}
              className="btn-ghost p-1.5 rounded"
              title="Mes anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-gray-800 w-44 text-center">
                {month ? formatMonthKey(monthKey) : '…'}
              </h1>
              {month?.status === 'closed' && (
                <span className="badge bg-green-50 text-green-700 border-green-200">Cerrado</span>
              )}
            </div>

            <button
              onClick={() => setMonthKey(k => nextMonth(k))}
              className="btn-ghost p-1.5 rounded"
              title="Mes siguiente"
            >
              <ChevronRight size={18} />
            </button>

            {!isCurrent && (
              <button
                onClick={goToCurrent}
                className="btn-ghost p-1.5 rounded ml-1"
                title="Ir al mes actual"
              >
                <Home size={16} />
              </button>
            )}
          </div>

          {/* Resumen rápido */}
          {settlement && (
            <div className="hidden md:flex items-center gap-4 text-xs text-gray-500 ml-auto">
              <span>{expenses.length} movimientos</span>
              <span className="font-semibold text-gray-800">
                {settlement.finalNet >= 0
                  ? `Meli → Fede: $${Math.round(settlement.finalNet).toLocaleString('es-AR')}`
                  : `Fede → Meli: $${Math.round(Math.abs(settlement.finalNet)).toLocaleString('es-AR')}`}
              </span>
            </div>
          )}
        </div>

        {/* ─── Tabs ────────────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-0 -mb-px">
            {([
              ['movimientos', 'Movimientos'],
              ['liquidacion', 'Liquidación'],
              ['historial', 'Historial'],
              ['datos', 'Importar / Exportar'],
            ] as [Tab, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
                {id === 'movimientos' && expenses.length > 0 && (
                  <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
                    {expenses.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ─── Contenido principal ────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {month && (
          <>
            {tab === 'movimientos' && (
              <MovimientosTab
                monthKey={monthKey}
                month={month}
                expenses={expenses}
                settlement={settlement}
                onRefresh={refresh}
              />
            )}
            {tab === 'liquidacion' && (
              <LiquidacionTab
                monthKey={monthKey}
                month={month}
                expenses={expenses}
                settlement={settlement}
                onRefresh={refresh}
              />
            )}
            {tab === 'historial' && (
              <HistorialTab
                currentMonthKey={monthKey}
                onSelectMonth={(key) => { setMonthKey(key); setTab('movimientos'); }}
              />
            )}
            {tab === 'datos' && (
              <ImportExportTab
                monthKey={monthKey}
                onRefresh={refresh}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
