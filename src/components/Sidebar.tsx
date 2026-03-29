import { useState } from 'react';
import { Home, List, Calculator, Clock, Upload, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

export type NavItem = 'home' | 'movimientos' | 'liquidacion' | 'historial' | 'datos' | 'ia';

interface Props {
  active: NavItem;
  onChange: (item: NavItem) => void;
  expenseCount?: number;
}

const NAV = [
  { id: 'home'        as NavItem, icon: Home,       label: 'Inicio'            },
  { id: 'movimientos' as NavItem, icon: List,        label: 'Movimientos'       },
  { id: 'liquidacion' as NavItem, icon: Calculator,  label: 'Liquidación'       },
  { id: 'historial'   as NavItem, icon: Clock,       label: 'Historial'         },
  { id: 'ia'          as NavItem, icon: Sparkles,    label: 'Importar con IA'   },
  { id: 'datos'       as NavItem, icon: Upload,      label: 'Importar / Exportar' },
];

export default function Sidebar({ active, onChange, expenseCount = 0 }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        hidden md:flex flex-col bg-white border-r border-gray-200
        transition-all duration-200 shrink-0
        ${collapsed ? 'w-14' : 'w-52'}
      `}
    >
      {/* Toggle */}
      <div className="flex items-center justify-end px-2 py-3 border-b border-gray-100">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="btn-ghost p-1.5 rounded text-gray-400 hover:text-gray-600"
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 space-y-0.5 px-1.5">
        {NAV.map(({ id, icon: Icon, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              title={collapsed ? label : undefined}
              className={`
                w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium
                transition-colors text-left
                ${isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}
              `}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="flex-1 truncate">{label}</span>
              )}
              {!collapsed && id === 'movimientos' && expenseCount > 0 && (
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 font-normal">
                  {expenseCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
