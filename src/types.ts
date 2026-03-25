// ─── Personas ────────────────────────────────────────────────────────────────
export type Owner = 'fede' | 'meli';

// ─── Monedas ──────────────────────────────────────────────────────────────────
export type Currency = 'ARS' | 'USD' | 'EUR';

// ─── Tipo de gasto ────────────────────────────────────────────────────────────
// Determina cómo impacta en la liquidación mensual
export type ExpenseType =
  | 'shared'        // Compartido entre ambos (÷ 2)
  | 'personal_fede' // Solo Fede — no se reparte
  | 'personal_meli' // Solo Meli — no se reparte
  | 'family_meli'   // Familia/mamá de Meli — EXCLUIDO de la liquidación familiar
  | 'extraordinary' // Gasto extraordinario del depto (trato especial si es necesario)
  | 'iva'           // IVA / impuesto — se registra por separado
  | 'excluded';     // Excluido por cualquier otro motivo

// ─── Categoría del gasto ─────────────────────────────────────────────────────
export type ExpenseCategory =
  | 'supermercado'
  | 'farmacia'
  | 'servicios'       // Expensas, gas, luz, internet
  | 'restaurante'
  | 'transporte'
  | 'indumentaria'
  | 'salud'
  | 'educacion'
  | 'suscripciones'
  | 'viajes'
  | 'hogar'           // Muebles, reparaciones, depto
  | 'combustible'
  | 'entretenimiento'
  | 'impuestos'       // ABL, patente, etc.
  | 'otro';

// ─── Movimiento (gasto / ingreso / ajuste) ───────────────────────────────────
export interface Expense {
  id?: number;

  // Contexto temporal
  monthKey: string;   // "2026-03" — índice principal
  date: string;       // "2026-03-15" — fecha del consumo o débito

  // Descripción
  description: string;
  category: ExpenseCategory;
  notes: string;
  evidenceRef: string;  // Link a Drive, referencia de mail, o descripción del ticket

  // Origen
  owner: Owner;
  card: string;         // Nombre de la tarjeta: "HSBC MC", "VISA Río", etc.

  // Cuotas
  installmentCurrent: number;  // 0 = sin cuotas
  installmentTotal: number;    // 0 = sin cuotas

  // Importe
  currency: Currency;
  originalAmount: number;   // Monto en la moneda original
  exchangeRate: number;     // 1 para ARS; cotización para USD/EUR
  taxes: number;            // Impuestos sobre consumos en moneda extranjera (ARS)
  amountARS: number;        // Total final en ARS (computed: originalAmount * exchangeRate + taxes)

  // Clasificación
  type: ExpenseType;

  // IVA (para gastos que tienen IVA discriminado)
  ivaAmount: number;   // 0 si no aplica

  // Metadatos
  createdAt: string;
  updatedAt: string;
}

// ─── Registro mensual ─────────────────────────────────────────────────────────
export interface MonthRecord {
  id?: number;
  monthKey: string;  // "2026-03"
  year: number;
  month: number;     // 1–12
  status: 'open' | 'closed';
  previousDebt: number;   // Deuda arrastrada del mes anterior (positivo = Meli debe a Fede)
  notes: string;
  closedAt: string;
}

// ─── Liquidación ─────────────────────────────────────────────────────────────
export interface Settlement {
  // Gastos compartidos
  fedePaidShared: number;    // Total que Fede pagó de gastos compartidos
  meliPaidShared: number;    // Total que Meli pagó de gastos compartidos
  sharedTotal: number;       // = fedePaidShared + meliPaidShared
  sharedPerPerson: number;   // = sharedTotal / 2

  // Diferencia en compartidos
  fedeBalance: number;       // fedePaidShared - sharedPerPerson (positivo = Fede pagó de más)
  meliBalance: number;       // meliPaidShared - sharedPerPerson (positivo = Meli pagó de más)

  // Gastos personales (informativo)
  fedePersonal: number;
  meliPersonal: number;

  // Gastos excluidos (informativo)
  familyMeli: number;
  otherExcluded: number;

  // IVA (informativo)
  ivaTotal: number;

  // Transferencia del mes
  netTransfer: number;  // Positivo = Meli transfiere a Fede; negativo = Fede transfiere a Meli

  // Deuda anterior
  previousDebt: number;

  // Total final
  finalNet: number;  // netTransfer + previousDebt
}

// ─── Resultado de importación CSV ────────────────────────────────────────────
export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}
