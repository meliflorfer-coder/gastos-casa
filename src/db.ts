import Dexie, { type Table } from 'dexie';
import type { Expense, MonthRecord } from './types';

class GastosCasaDB extends Dexie {
  months!: Table<MonthRecord>;
  expenses!: Table<Expense>;

  constructor() {
    super('gastos-casa');

    this.version(1).stores({
      // Índices: primaryKey, luego campos indexados
      months:   '++id, monthKey, status, year, month',
      expenses: '++id, monthKey, owner, type, date, card',
    });
  }
}

export const db = new GastosCasaDB();

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getOrCreateMonth(monthKey: string): Promise<MonthRecord> {
  const [year, month] = monthKey.split('-').map(Number);
  let record = await db.months.where('monthKey').equals(monthKey).first();
  if (!record) {
    const id = await db.months.add({
      monthKey,
      year,
      month,
      status: 'open',
      previousDebt: 0,
      notes: '',
      closedAt: '',
    });
    record = await db.months.get(id);
  }
  return record!;
}

export async function getExpensesByMonth(monthKey: string): Promise<Expense[]> {
  return db.expenses
    .where('monthKey')
    .equals(monthKey)
    .sortBy('date');
}

export async function saveExpense(expense: Omit<Expense, 'id'> & { id?: number }): Promise<number> {
  const now = new Date().toISOString();
  if (expense.id) {
    await db.expenses.update(expense.id, { ...expense, updatedAt: now });
    return expense.id;
  }
  return db.expenses.add({ ...expense, createdAt: now, updatedAt: now }) as Promise<number>;
}

export async function deleteExpense(id: number): Promise<void> {
  await db.expenses.delete(id);
}

export async function updateMonthRecord(monthKey: string, data: Partial<MonthRecord>): Promise<void> {
  await db.months.where('monthKey').equals(monthKey).modify(data);
}

export async function getAllMonths(): Promise<MonthRecord[]> {
  return db.months.orderBy('monthKey').reverse().toArray();
}

/** Importa gastos en bulk — usado por el importador CSV */
export async function bulkImportExpenses(expenses: Omit<Expense, 'id'>[]): Promise<number> {
  const now = new Date().toISOString();
  const withTimestamps = expenses.map(e => ({
    ...e,
    createdAt: e.createdAt || now,
    updatedAt: now,
  }));
  const ids = await db.expenses.bulkAdd(withTimestamps, { allKeys: true }) as number[];
  return ids.length;
}

/** Exporta todos los datos como JSON (backup completo) */
export async function exportAllData() {
  const months = await db.months.toArray();
  const expenses = await db.expenses.toArray();
  return { months, expenses, exportedAt: new Date().toISOString() };
}

/** Importa un backup JSON completo */
export async function importBackup(data: { months: MonthRecord[]; expenses: Expense[] }) {
  await db.transaction('rw', db.months, db.expenses, async () => {
    // Meses: insertar si no existen
    for (const m of data.months) {
      const existing = await db.months.where('monthKey').equals(m.monthKey).first();
      if (!existing) {
        const { id: _, ...rest } = m;
        await db.months.add(rest);
      }
    }
    // Gastos: insertar todos sin ID para evitar colisiones
    const expensesWithoutIds = data.expenses.map(({ id: _, ...rest }) => rest);
    await db.expenses.bulkAdd(expensesWithoutIds);
  });
}
