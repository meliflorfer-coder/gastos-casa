import { List, Calculator, Clock, Upload, TrendingUp, TrendingDown } from 'lucide-react';
import type { Expense, MonthRecord, Settlement } from '../types';
import type { NavItem } from './Sidebar';
import { formatARS, formatMonthKey } from '../utils/formatters';
import { CATEGORY_LABELS, EXPENSE_TYPE_LABELS } from '../constants';

interface Props {
  monthKey: string;
  month: MonthRecord;
  expenses: Expense[];
  settlement: Settlement | null;
  onNavigate: (item: NavItem) => void;
}

const SECTIONS: { id: NavItem; icon: React.ElementType; label: string; desc: string; color: string }[] = [
  {
    id: 'movimientos',
    icon: List,
    label: 'Movimientos',
    desc: 'Cargá y revisá los gastos del mes',
    color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  },
  {
    id: 'liquidacion',
    icon: Calculator,
    label: 'Liquidación',
    desc: 'Calculá quién le debe a quién',
    color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
  },
  {
    id: 'historial',
    icon: Clock,
    label: 'Historial',
    desc: 'Revisá todos los meses anteriores',
    color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  },
  {
    id: 'datos',
    icon: Upload,
    label: 'Importar / Exportar',
    desc: 'Cargá CSV o hacé backup de tus datos',
    color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
  },
];

export default function HomeTab({ monthKey, month, expenses, settlement, onNavigate }: Props) {
  const s = settlement;

  // Top 3 categorías del mes
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    if (e.type === 'excluded' || e.type === 'third_party') return acc;
    acc[e.category] = (acc[e.category] || 0) + e.amountARS;
    return acc;
  }, {});
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Últimos 5 movimientos
  const recent = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ─── Resumen del mes ─────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">{formatMonthKey(monthKey)}</h2>
          {month.status === 'closed' && (
            <span className="badge bg-green-50 text-green-700 border-green-200">✓ Cerrado</span>
          )}
        </div>

        {s && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Movimientos" value={String(expenses.length)} />
            <Stat label="Total compartido" value={formatARS(s.sharedTotal)} />
            <Stat label="Fede pagó" value={formatARS(s.fedePaidShared)} accent="orange" />
            <Stat label="Meli pagó" value={formatARS(s.meliPaidShared)} accent="purple" />
          </div>
        )}

        {s && s.sharedTotal > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              {s.finalNet >= 0
                ? <TrendingUp size={18} className="text-orange-500 shrink-0" />
                : <TrendingDown size={18} className="text-purple-500 shrink-0" />}
              <p className="text-sm font-medium text-gray-700">
                {s.finalNet >= 0
                  ? <>Meli transfiere <span className="font-bold text-orange-700">{formatARS(Math.abs(s.finalNet))}</span> a Fede</>
                  : <>Fede transfiere <span className="font-bold text-purple-700">{formatARS(Math.abs(s.finalNet))}</span> a Meli</>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Accesos rápidos ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {SECTIONS.map(({ id, icon: Icon, label, desc, color }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`card border p-4 text-left flex items-start gap-3 transition-colors ${color}`}
          >
            <Icon size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs opacity-70 mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ─── Top categorías + Últimos movimientos ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {topCategories.length > 0 && (
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Top categorías del mes
            </p>
            <div className="space-y-2">
              {topCategories.map(([cat, total]) => (
                <div key={cat} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat}</span>
                  <span className="font-mono font-semibold text-gray-800">{formatARS(total)}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigate('movimientos')}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              Ver todos →
            </button>
          </div>
        )}

        {recent.length > 0 && (
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Últimos movimientos
            </p>
            <div className="space-y-2">
              {recent.map(e => (
                <div key={e.id} className="flex justify-between items-center text-sm gap-2">
                  <span className="text-gray-600 truncate">{e.description || CATEGORY_LABELS[e.category] || e.category}</span>
                  <span className="font-mono text-gray-800 shrink-0">{formatARS(e.amountARS)}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigate('movimientos')}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              Ver todos →
            </button>
          </div>
        )}

        {expenses.length === 0 && (
          <div className="card p-6 col-span-2 text-center text-gray-400 text-sm">
            No hay movimientos cargados este mes.{' '}
            <button onClick={() => onNavigate('movimientos')} className="text-blue-600 hover:underline">
              Agregar el primero →
            </button>
          </div>
        )}
      </div>

      {/* ─── Detalle por tipo ────────────────────────────────────────────────── */}
      {s && expenses.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Distribución por tipo
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.entries(EXPENSE_TYPE_LABELS) as [string, string][]).map(([type, label]) => {
              const total = expenses
                .filter(e => e.type === type)
                .reduce((sum, e) => sum + e.amountARS, 0);
              if (total === 0) return null;
              return (
                <div key={type} className="text-sm">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-mono font-semibold text-gray-800">{formatARS(total)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'orange' | 'purple' }) {
  const valueClass = accent === 'orange'
    ? 'text-orange-700'
    : accent === 'purple'
      ? 'text-purple-700'
      : 'text-gray-800';
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`font-bold font-mono text-base ${valueClass}`}>{value}</p>
    </div>
  );
}
