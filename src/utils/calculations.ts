import type { Expense, Settlement } from '../types';

/**
 * Calcula la liquidación mensual a partir de la lista de gastos y la deuda anterior.
 *
 * Lógica (igual que la planilla histórica):
 * - Se consideran solo gastos "shared" para el reparto 50/50.
 * - Quien pagó más en gastos compartidos recibe la diferencia.
 * - Se suman los gastos personales de cada uno (informativo).
 * - Los gastos excluidos / familia Meli NO impactan en la liquidación.
 * - La deuda del mes anterior se suma al total final.
 */
export function calculateSettlement(expenses: Expense[], previousDebt: number): Settlement {
  // Gastos compartidos
  const shared = expenses.filter(e => e.type === 'shared');
  const fedePaidShared = shared
    .filter(e => e.owner === 'fede')
    .reduce((s, e) => s + e.amountARS, 0);
  const meliPaidShared = shared
    .filter(e => e.owner === 'meli')
    .reduce((s, e) => s + e.amountARS, 0);
  const sharedTotal = fedePaidShared + meliPaidShared;
  const sharedPerPerson = sharedTotal / 2;

  // Balance por persona: cuánto pagó de MÁS o de MENOS en compartidos
  const fedeBalance = fedePaidShared - sharedPerPerson; // + = Fede pagó de más → Meli le debe
  const meliBalance = meliPaidShared - sharedPerPerson; // + = Meli pagó de más → Fede le debe

  // Transferencia neta: positivo = Meli transfiere a Fede
  //   Si Fede pagó de más → Meli debe reembolsarle → netTransfer > 0
  //   Si Meli pagó de más → Fede debe reembolsarle → netTransfer < 0
  const netTransfer = fedeBalance; // equivalente a (fedePaidShared - meliPaidShared) / 2

  // Personales (informativos)
  const fedePersonal = expenses
    .filter(e => e.type === 'personal_fede')
    .reduce((s, e) => s + e.amountARS, 0);
  const meliPersonal = expenses
    .filter(e => e.type === 'personal_meli')
    .reduce((s, e) => s + e.amountARS, 0);

  // Excluidos (informativos)
  const familyMeli = expenses
    .filter(e => e.type === 'family_meli')
    .reduce((s, e) => s + e.amountARS, 0);
  const otherExcluded = expenses
    .filter(e => e.type === 'excluded')
    .reduce((s, e) => s + e.amountARS, 0);

  // IVA (informativo)
  const ivaTotal = expenses
    .filter(e => e.type === 'iva')
    .reduce((s, e) => s + e.amountARS, 0)
    + expenses.reduce((s, e) => s + (e.ivaAmount || 0), 0);

  // Total final = transferencia del mes + deuda anterior
  const finalNet = netTransfer + previousDebt;

  return {
    fedePaidShared,
    meliPaidShared,
    sharedTotal,
    sharedPerPerson,
    fedeBalance,
    meliBalance,
    fedePersonal,
    meliPersonal,
    familyMeli,
    otherExcluded,
    ivaTotal,
    netTransfer,
    previousDebt,
    finalNet,
  };
}

/** Calcula el monto en ARS para un gasto */
export function computeAmountARS(
  originalAmount: number,
  currency: 'ARS' | 'USD' | 'EUR',
  exchangeRate: number,
  taxes: number,
): number {
  if (currency === 'ARS') return originalAmount;
  return originalAmount * exchangeRate + taxes;
}

/** Genera el monthKey a partir de año y mes */
export function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Parsea un monthKey a año y mes */
export function fromMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m };
}

/** Navega al mes siguiente */
export function nextMonth(key: string): string {
  const { year, month } = fromMonthKey(key);
  if (month === 12) return toMonthKey(year + 1, 1);
  return toMonthKey(year, month + 1);
}

/** Navega al mes anterior */
export function prevMonth(key: string): string {
  const { year, month } = fromMonthKey(key);
  if (month === 1) return toMonthKey(year - 1, 12);
  return toMonthKey(year, month - 1);
}

/** Mes actual como monthKey */
export function currentMonthKey(): string {
  const now = new Date();
  return toMonthKey(now.getFullYear(), now.getMonth() + 1);
}
