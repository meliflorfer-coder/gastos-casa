import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ExpenseCategory, ExpenseType } from '../types';

// ─── Tipos de respuesta de Gemini ─────────────────────────────────────────────

export interface GeminiExpense {
  date: string;               // YYYY-MM-DD
  description: string;
  amountARS: number;
  currency: 'ARS' | 'USD' | 'EUR';
  originalAmount: number;
  exchangeRate: number;
  taxes: number;
  category: ExpenseCategory;
  type: ExpenseType;
  installmentCurrent: number;
  installmentTotal: number;
  ivaAmount: number;          // 0 si no hay IVA discriminado
  ivaTracked: boolean;
  card: string;
  notes: string;
}

export interface GeminiResult {
  expenses: GeminiExpense[];
  isInvoice: boolean;         // true si el doc es una factura con IVA discriminado
  invoiceIvaAmount: number;   // IVA total de la factura
  invoiceTotal: number;       // Total de la factura
  invoiceNotes: string;       // CUIT emisor, número de factura, etc.
  documentType: string;       // 'resumen_tarjeta' | 'factura' | 'ticket' | 'extracto_banco' | 'excel' | 'otro'
  rawSummary: string;         // Descripción breve del documento
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Sos un asistente experto en contabilidad argentina. Analizás documentos financieros y extraés los datos de gastos en formato JSON.

Categorías válidas: supermercado, farmacia, servicios, restaurante, transporte, indumentaria, salud, educacion, suscripciones, viajes, hogar, combustible, entretenimiento, impuestos, otro

Tipos válidos: shared (gastos del hogar compartidos), personal_fede, personal_meli, third_party (gastos de terceros que no aplican a ninguno), extraordinary (gasto extraordinario del depto), iva (solo si es un ítem de IVA puro), excluded

Devolvé SOLO el siguiente JSON sin texto adicional, sin markdown, sin bloques de código:
{
  "documentType": "resumen_tarjeta" | "factura" | "ticket" | "extracto_banco" | "excel" | "otro",
  "rawSummary": "descripción breve de qué es el documento",
  "isInvoice": boolean,
  "invoiceIvaAmount": número (0 si no aplica),
  "invoiceTotal": número (0 si no aplica),
  "invoiceNotes": "CUIT emisor, número de factura, CAE si están disponibles",
  "expenses": [
    {
      "date": "YYYY-MM-DD",
      "description": "descripción del ítem",
      "amountARS": número en pesos,
      "currency": "ARS" | "USD" | "EUR",
      "originalAmount": número en la moneda original,
      "exchangeRate": número (1 si es ARS),
      "taxes": 0,
      "category": una de las categorías válidas,
      "type": uno de los tipos válidos,
      "installmentCurrent": número (1 si no hay cuotas),
      "installmentTotal": número (1 si no hay cuotas),
      "ivaAmount": número (0 si no está discriminado, o el monto exacto si la factura lo muestra),
      "ivaTracked": boolean (true solo si hay factura con IVA discriminado),
      "card": "nombre de tarjeta o medio de pago si se detecta, sino vacío",
      "notes": "info adicional relevante"
    }
  ]
}

Reglas importantes:
- Si es un resumen de tarjeta/banco con muchas transacciones, extraé CADA UNA como ítem separado
- Si es una factura (tiene CUIT, CAE, IVA discriminado), marcá isInvoice: true y completá invoiceIvaAmount con el IVA discriminado
- Si detectás cuotas (ej: "Cuota 3/12"), ponelos en installmentCurrent y installmentTotal
- Para gastos en USD/EUR con tipo de cambio visible, usá currency correcta y calculá amountARS = originalAmount * exchangeRate
- Si no podés determinar el tipo de gasto, usá "shared"
- Si no podés determinar la categoría, usá "otro"
- Fechas siempre en formato YYYY-MM-DD. Si solo hay mes/año, usá el día 1
- Importes siempre como números, sin símbolos ni puntos de miles`;

// ─── Helpers para preparar archivos ───────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // quitar el prefijo data:...;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function excelToText(file: File): Promise<string> {
  // Importación dinámica para no penalizar el bundle si no se usa Excel
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  let text = '';
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    text += `[Hoja: ${sheetName}]\n`;
    text += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
  }
  return text;
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function analyzeDocumentWithGemini(
  file: File,
  monthKey: string,
): Promise<GeminiResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Falta la variable VITE_GEMINI_API_KEY en el entorno.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const mimeType = file.type;
  const isExcel = mimeType.includes('spreadsheet') || mimeType.includes('excel')
    || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');

  const contextPrompt = `Mes de referencia: ${monthKey}. Nombre del archivo: ${file.name}.\n\n${SYSTEM_PROMPT}`;

  let result;

  if (isExcel || mimeType === 'text/csv' || mimeType === 'text/plain') {
    // Excel/CSV/texto → convertir a texto plano y enviar como texto
    let text: string;
    if (isExcel && !mimeType.includes('csv')) {
      text = await excelToText(file);
    } else {
      text = await file.text();
    }
    result = await model.generateContent([contextPrompt, text]);
  } else {
    // PDF o imagen → enviar como inline data
    const base64 = await fileToBase64(file);
    result = await model.generateContent([
      contextPrompt,
      { inlineData: { mimeType: mimeType || 'application/pdf', data: base64 } },
    ]);
  }

  const text = result.response.text().trim();

  // Limpiar posible markdown que Gemini a veces agrega igual
  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed: GeminiResult;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Gemini devolvió un formato inesperado. Respuesta:\n${text.slice(0, 500)}`);
  }

  // Asegurar campos obligatorios con defaults
  return {
    documentType: parsed.documentType ?? 'otro',
    rawSummary: parsed.rawSummary ?? file.name,
    isInvoice: parsed.isInvoice ?? false,
    invoiceIvaAmount: parsed.invoiceIvaAmount ?? 0,
    invoiceTotal: parsed.invoiceTotal ?? 0,
    invoiceNotes: parsed.invoiceNotes ?? '',
    expenses: (parsed.expenses ?? []).map(e => ({
      date: e.date ?? `${monthKey}-01`,
      description: e.description ?? '',
      amountARS: e.amountARS ?? 0,
      currency: e.currency ?? 'ARS',
      originalAmount: e.originalAmount ?? e.amountARS ?? 0,
      exchangeRate: e.exchangeRate ?? 1,
      taxes: e.taxes ?? 0,
      category: e.category ?? 'otro',
      type: e.type ?? 'shared',
      installmentCurrent: e.installmentCurrent ?? 1,
      installmentTotal: e.installmentTotal ?? 1,
      ivaAmount: e.ivaAmount ?? 0,
      ivaTracked: e.ivaTracked ?? false,
      card: e.card ?? '',
      notes: e.notes ?? '',
    })),
  };
}
