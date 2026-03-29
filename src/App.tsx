import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { getOrCreateMonth, getExpensesByMonth } from './db';
import { calculateSettlement, currentMonthKey, nextMonth, prevMonth } from './utils/calculations';
import { formatMonthKey } from './utils/formatters';
import type { Expense, MonthRecord, Settlement } from './types';

import Sidebar, { type NavItem } from './components/Sidebar';
import HomeTab from './components/HomeTab';
import MovimientosTab from './components/MovimientosTab';
import LiquidacionTab from './components/LiquidacionTab';
import HistorialTab from './components/HistorialTab';
import ImportExportTab from './components/ImportExportTab';
import ImportAITab from './components/ImportAITab';

export default function App() {
  const [monthKey, setMonthKey] = useState<string>(currentMonthKey);
  const [nav, setNav] = useState<NavItem>('home');
  const [month, setMonth] = useState<MonthRecord | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlement, setSettlement] = useState<Settlement | null>(null);

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

  const refresh = useCallback(() => loadMonth(monthKey), [monthKey, loadMonth]);

  const isCurrent = monthKey === currentMonthKey();

  // Historial navega al mes y abre movimientos
  const handleSelectMonth = (key: string) => {
    setMonthKey(key);
    setNav('movimientos');
  };

  const showMonthNav = nav === 'home' || nav === 'movimientos' || nav === 'liquidacion';

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-full px-4 py-3 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0 w-52 shrink-0">
            <span className="text-lg">🏠</span>
            <span className="font-semibold text-gray-800 hidden md:block">Gastos Casa</span>
          </div>

          {/* Navegación de mes — solo en vistas contextuales */}
          {showMonthNav && (
            <div className="flex items-center gap-1 mx-auto">
              <button
                onClick={() => setMonthKey(k => prevMonth(k))}
                className="btn-ghost p-1.5 rounded"
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
              >
                <ChevronRight size={18} />
              </button>

              {!isCurrent && (
                <button
                  onClick={() => setMonthKey(currentMonthKey())}
                  className="btn-ghost p-1.5 rounded ml-1"
                  title="Ir al mes actual"
                >
                  <Home size={16} />
                </button>
              )}
            </div>
          )}

          {/* Resumen rápido */}
          {settlement && showMonthNav && (
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
      </header>

      {/* ─── Layout principal ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={nav} onChange={setNav} expenseCount={expenses.length} />

        <main className="flex-1 overflow-auto px-4 py-6">
          <div className="max-w-7xl mx-auto">
            {month && (
              <>
                {nav === 'home' && (
                  <HomeTab
                    monthKey={monthKey}
                    month={month}
                    expenses={expenses}
                    settlement={settlement}
                    onNavigate={setNav}
                  />
                )}
                {nav === 'movimientos' && (
                  <MovimientosTab
                    monthKey={monthKey}
                    month={month}
                    expenses={expenses}
                    settlement={settlement}
                    onRefresh={refresh}
                  />
                )}
                {nav === 'liquidacion' && (
                  <LiquidacionTab
                    monthKey={monthKey}
                    month={month}
                    expenses={expenses}
                    settlement={settlement}
                    onRefresh={refresh}
                  />
                )}
                {nav === 'historial' && (
                  <HistorialTab
                    currentMonthKey={monthKey}
                    onSelectMonth={handleSelectMonth}
                  />
                )}
                {nav === 'ia' && (
                  <ImportAITab
                    monthKey={monthKey}
                    onRefresh={refresh}
                  />
                )}
                {nav === 'datos' && (
                  <ImportExportTab
                    monthKey={monthKey}
                    onRefresh={refresh}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
