import type { Expense, ExpenseType, Owner } from '../types';
import type { ImportResult } from '../types';
import { computeAmountARS } from './calculations';

/**
 * Importador genérico CSV.
 * Formato esperado (con encabezado):
 *   fecha, descripcion, propietario, tarjeta, cuota_actual, cuota_total,
 *   moneda, importe_original, cotizacion, impuestos, tipo, categoria, notas, referencia
 *
 * Separador: coma o punto y coma.
 * La primera fila se ignora si contiene encabezados (detectado automáticamente).
 */
export function parseGenericCSV(csvText: string, monthKey: string): { expenses: Omit<Expense, 'id'>[]; result: ImportResult } {
  const lines = csvText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return { expenses: [], result: { imported: 0, skipped: 0, errors: ['El archivo está vacío.'] } };
  }

  // Detectar separador
  const sep = lines[0].includes(';') ? ';' : ',';

  // Saltar encabezado si la primera fila tiene letras en el campo de fecha
  const firstField = lines[0].split(sep)[0].toLowerCase().trim();
  const hasHeader = isNaN(Date.parse(firstField)) && !/^\d/.test(firstField);
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const expenses: Omit<Expense, 'id'>[] = [];
  const errors: string[] = [];
  let skipped = 0;
  const now = new Date().toISOString();

  dataLines.forEach((line, lineIndex) => {
    const row = lineIndex + (hasHeader ? 2 : 1);
    const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));

    if (cols.length < 5) {
      errors.push(`Fila ${row}: columnas insuficientes (se esperan al menos 5)`);
      skipped++;
      return;
    }

    const [
      date = '',
      description = '',
      ownerRaw = '',
      card = '',
      cuotaActualRaw = '0',
      cuotaTotalRaw = '0',
      currencyRaw = 'ARS',
      amountRaw = '0',
      exchangeRaw = '1',
      taxesRaw = '0',
      typeRaw = 'shared',
      category = 'otro',
      notes = '',
      evidenceRef = '',
    ] = cols;

    if (!date || !description) {
      skipped++;
      return;
    }

    const owner = normalizeOwner(ownerRaw);
    const currency = normalizeCurrency(currencyRaw);
    const type = normalizeType(typeRaw);
    const originalAmount = parseNumber(amountRaw);
    const exchangeRate = parseNumber(exchangeRaw) || 1;
    const taxes = parseNumber(taxesRaw);
    const amountARS = computeAmountARS(originalAmount, currency, exchangeRate, taxes);

    expenses.push({
      monthKey,
      date: normalizeDate(date),
      description,
      category: (category as Expense['category']) || 'otro',
      notes,
      evidenceRef,
      owner,
      card: card || (owner === 'fede' ? 'HSBC MC' : 'VISA Río'),
      installmentCurrent: parseInt(cuotaActualRaw) || 0,
      installmentTotal: parseInt(cuotaTotalRaw) || 0,
      currency,
      originalAmount,
      exchangeRate,
      taxes,
      amountARS,
      type,
      ivaAmount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    expenses,
    result: {
      imported: expenses.length,
      skipped,
      errors,
    },
  };
}

/**
 * Importador desde el formato de la planilla histórica de Google Sheets.
 * Columnas esperadas (del análisis de la planilla):
 *   A: mes | B: tarjeta | C: descripción | D: cuota | E: $ARS | F: USD | G: cotiz | H: total | I: c/u
 *
 * Este importer es tolerante: trata de inferir lo que puede.
 */
export function parseLegacySheetCSV(csvText: string, monthKey: string): { expenses: Omit<Expense, 'id'>[]; result: ImportResult } {
  const lines = csvText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const sep = lines[0]?.includes(';') ? ';' : ',';
  const expenses: Omit<Expense, 'id'>[] = [];
  const errors: string[] = [];
  let skipped = 0;
  const now = new Date().toISOString();

  // Saltar fila de encabezado
  const dataLines = lines.slice(1);

  dataLines.forEach((line) => {
    const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const [, cardRaw = '', description = '', cuotaRaw = '', arsRaw = '', usdRaw = '', cotizRaw = ''] = cols;

    if (!description || description.toLowerCase().includes('total') || description.toLowerCase().includes('propios')) {
      skipped++;
      return;
    }

    const owner = inferOwnerFromCard(cardRaw);
    const card = normalizeCardName(cardRaw);
    const [cuotaActual, cuotaTotal] = parseCuota(cuotaRaw);
    const arsAmt = parseNumber(arsRaw);
    const usdAmt = parseNumber(usdRaw);
    const cotiz = parseNumber(cotizRaw);

    let currency: 'ARS' | 'USD' = 'ARS';
    let originalAmount = arsAmt;
    let exchangeRate = 1;

    if (usdAmt > 0 && cotiz > 0) {
      currency = 'USD';
      originalAmount = usdAmt;
      exchangeRate = cotiz;
    }

    const amountARS = currency === 'USD' ? usdAmt * cotiz : arsAmt;

    if (!description || amountARS <= 0) {
      skipped++;
      return;
    }

    expenses.push({
      monthKey,
      date: `${monthKey}-01`,  // Sin fecha exacta en la planilla legacy
      description,
      category: inferCategory(description),
      notes: '',
      evidenceRef: '',
      owner,
      card,
      installmentCurrent: cuotaActual,
      installmentTotal: cuotaTotal,
      currency,
      originalAmount,
      exchangeRate,
      taxes: 0,
      amountARS,
      type: 'shared',  // Por defecto shared — el usuario puede reclasificar
      ivaAmount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    expenses,
    result: {
      imported: expenses.length,
      skipped,
      errors,
    },
  };
}

// ─── Utilidades internas ──────────────────────────────────────────────────────

function parseNumber(s: string): number {
  if (!s) return 0;
  // Eliminar separadores de miles y normalizar decimal
  const cleaned = s.replace(/[$€\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function normalizeOwner(raw: string): Owner {
  const r = raw.toLowerCase();
  if (r.includes('meli') || r.includes('mel')) return 'meli';
  return 'fede';
}

function normalizeCurrency(raw: string): 'ARS' | 'USD' | 'EUR' {
  const r = raw.toUpperCase().trim();
  if (r === 'USD' || r === 'U$S' || r === 'DOLAR' || r === 'DÓLAR') return 'USD';
  if (r === 'EUR' || r === 'EURO') return 'EUR';
  return 'ARS';
}

function normalizeType(raw: string): ExpenseType {
  const r = raw.toLowerCase().replace(/[_\s]/g, '');
  if (r.includes('shared') || r.includes('compartido')) return 'shared';
  if (r.includes('fede')) return 'personal_fede';
  if (r.includes('familiam') || r.includes('mamam')) return 'family_meli';
  if (r.includes('meli')) return 'personal_meli';
  if (r.includes('extra') || r.includes('depto')) return 'extraordinary';
  if (r.includes('iva')) return 'iva';
  if (r.includes('exclu')) return 'excluded';
  return 'shared';
}

function normalizeDate(raw: string): string {
  // Intenta varios formatos: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('/');
    return `${y}-${m}-${d}`;
  }
  return raw;
}

function inferOwnerFromCard(card: string): Owner {
  const c = card.toLowerCase();
  if (c.includes('meli') || c.includes('mel ')) return 'meli';
  return 'fede';
}

function normalizeCardName(raw: string): string {
  const c = raw.toLowerCase();
  if (c.includes('hsbc') && c.includes('mc')) return 'HSBC MC';
  if (c.includes('hsbc') && c.includes('visa')) return 'HSBC VISA';
  if (c.includes('galicia')) return 'Galicia';
  if (c.includes('amex') && c.includes('meli')) return 'AMEX Río';
  if (c.includes('visa') && (c.includes('río') || c.includes('rio') || c.includes('san'))) return 'VISA Río';
  if (c.includes('amex')) return 'AMEX Río';
  if (c.includes('naranja')) return 'Naranja';
  if (c.includes('mp') || c.includes('mercado')) return 'MercadoPago';
  if (c.includes('debit') || c.includes('débito') || c.includes('debito')) return 'Débito';
  return raw;
}

function parseCuota(raw: string): [number, number] {
  if (!raw) return [0, 0];
  const match = raw.match(/(\d+)[\/\\](\d+)/);
  if (match) return [parseInt(match[1]), parseInt(match[2])];
  return [0, 0];
}

function inferCategory(desc: string): Expense['category'] {
  const d = desc.toLowerCase();
  if (/coto|jumbo|carrefour|super|mercado|don zoilo|juvenil/.test(d)) return 'supermercado';
  if (/farmac|fybeca|drog/.test(d)) return 'farmacia';
  if (/expensa|edesur|gas ban|iplan|internet|telefon|celular|smg/.test(d)) return 'servicios';
  if (/café|cafe|pedidos|rappi|rest|bur|pizz|sushi|delivery/.test(d)) return 'restaurante';
  if (/cabify|uber|taxi|colect|subte|nafta/.test(d)) return 'transporte';
  if (/nafta|ypf|shell|axion/.test(d)) return 'combustible';
  if (/health|medico|médico|clínica|clinica|hospital|farmaci|osde/.test(d)) return 'salud';
  if (/colegio|escuela|inglés|ingles|brigida|ferro|colonia|libro/.test(d)) return 'educacion';
  if (/netflix|spotify|apple|youtube|amazon|disney|suscr/.test(d)) return 'suscripciones';
  if (/hotel|vuelo|aerolin|smiles|viaje|trip/.test(d)) return 'viajes';
  if (/abl|patente|impuesto|afip|arca/.test(d)) return 'impuestos';
  if (/ropa|indument|zara|levis|ossira|grisino|adidas|nike/.test(d)) return 'indumentaria';
  return 'otro';
}
