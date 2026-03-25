import type { ExpenseCategory, ExpenseType, Owner } from './types';

// ─── Tarjetas por persona ─────────────────────────────────────────────────────
export const CARDS: Record<Owner, string[]> = {
  fede: [
    'HSBC MC',
    'HSBC VISA',
    'Galicia',
    'Débito',
    'Débito Automático',
    'Transferencia',
    'Efectivo',
  ],
  meli: [
    'VISA Río',
    'AMEX Río',
    'Galicia VISA',
    'Galicia MC',
    'MercadoPago',
    'Naranja',
    'AMEX',
    'Débito',
    'Transferencia',
    'Efectivo',
  ],
};

// ─── Tipos de gasto ───────────────────────────────────────────────────────────
export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  shared:        'Compartido',
  personal_fede: 'Personal Fede',
  personal_meli: 'Personal Meli',
  family_meli:   'Familia Meli',
  extraordinary: 'Gasto Depto',
  iva:           'IVA',
  excluded:      'Excluido',
};

export const EXPENSE_TYPE_COLORS: Record<ExpenseType, string> = {
  shared:        'bg-blue-50 text-blue-800 border-blue-200',
  personal_fede: 'bg-orange-50 text-orange-800 border-orange-200',
  personal_meli: 'bg-purple-50 text-purple-800 border-purple-200',
  family_meli:   'bg-gray-100 text-gray-500 border-gray-200',
  extraordinary: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  iva:           'bg-green-50 text-green-800 border-green-200',
  excluded:      'bg-gray-100 text-gray-400 border-gray-200',
};

export const EXPENSE_TYPE_ROW_COLORS: Record<ExpenseType, string> = {
  shared:        'bg-blue-50/40',
  personal_fede: 'bg-orange-50/40',
  personal_meli: 'bg-purple-50/40',
  family_meli:   'bg-gray-50/60',
  extraordinary: 'bg-yellow-50/40',
  iva:           'bg-green-50/40',
  excluded:      'bg-gray-50/60',
};

// Tipos que SÍ entran en la liquidación
export const BILLABLE_TYPES: ExpenseType[] = ['shared', 'personal_fede', 'personal_meli', 'extraordinary'];

// ─── Categorías ───────────────────────────────────────────────────────────────
export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  supermercado:   'Supermercado',
  farmacia:       'Farmacia',
  servicios:      'Servicios (Expensas, Gas, Luz)',
  restaurante:    'Restaurante / Delivery',
  transporte:     'Transporte',
  indumentaria:   'Indumentaria',
  salud:          'Salud',
  educacion:      'Educación',
  suscripciones:  'Suscripciones',
  viajes:         'Viajes',
  hogar:          'Hogar / Depto',
  combustible:    'Combustible',
  entretenimiento:'Entretenimiento',
  impuestos:      'Impuestos (ABL, Patente)',
  otro:           'Otro',
};

// ─── Meses ────────────────────────────────────────────────────────────────────
export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ─── Defaults ─────────────────────────────────────────────────────────────────
export const EMPTY_EXPENSE = {
  date: new Date().toISOString().slice(0, 10),
  description: '',
  category: 'otro' as ExpenseCategory,
  notes: '',
  evidenceRef: '',
  owner: 'fede' as Owner,
  card: 'HSBC MC',
  installmentCurrent: 0,
  installmentTotal: 0,
  currency: 'ARS' as const,
  originalAmount: 0,
  exchangeRate: 1,
  taxes: 0,
  amountARS: 0,
  type: 'shared' as ExpenseType,
  ivaAmount: 0,
};
