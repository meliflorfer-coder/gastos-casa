import { MONTH_NAMES } from '../constants';
import { fromMonthKey } from './calculations';

const ARS_FORMATTER = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const USD_FORMATTER = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatARS(amount: number): string {
  return ARS_FORMATTER.format(amount);
}

export function formatUSD(amount: number): string {
  return USD_FORMATTER.format(amount);
}

export function formatMonthKey(key: string): string {
  const { year, month } = fromMonthKey(key);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

export function formatInstallment(current: number, total: number): string {
  if (!current || !total || total <= 1) return '';
  return `${String(current).padStart(2, '0')}/${String(total).padStart(2, '0')}`;
}

/** Genera el nombre del archivo de exportación */
export function exportFilename(suffix: string): string {
  const now = new Date();
  const d = now.toISOString().slice(0, 10);
  return `gastos-casa_${suffix}_${d}`;
}
