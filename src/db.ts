import { createClient } from '@supabase/supabase-js';
import type { Expense, MonthRecord } from './types';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getOrCreateMonth(monthKey: string): Promise<MonthRecord> {
  const [year, month] = monthKey.split('-').map(Number);

  const { data: existing } = await supabase
    .from('months')
    .select('*')
    .eq('monthKey', monthKey)
    .maybeSingle();

  if (existing) return existing as MonthRecord;

  const { data: created } = await supabase
    .from('months')
    .insert({ monthKey, year, month, status: 'open', previousDebt: 0, notes: '', closedAt: '' })
    .select()
    .single();

  return created as MonthRecord;
}

export async function getExpensesByMonth(monthKey: string): Promise<Expense[]> {
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('monthKey', monthKey)
    .order('date', { ascending: true });

  return (data || []) as Expense[];
}

export async function saveExpense(expense: Omit<Expense, 'id'> & { id?: number }): Promise<number> {
  const now = new Date().toISOString();

  if (expense.id) {
    await supabase
      .from('expenses')
      .update({ ...expense, updatedAt: now })
      .eq('id', expense.id);
    return expense.id;
  }

  const { data } = await supabase
    .from('expenses')
    .insert({ ...expense, createdAt: now, updatedAt: now })
    .select('id')
    .single();

  return (data as { id: number }).id;
}

export async function deleteExpense(id: number): Promise<void> {
  await supabase.from('expenses').delete().eq('id', id);
}

export async function updateMonthRecord(monthKey: string, data: Partial<MonthRecord>): Promise<void> {
  await supabase.from('months').update(data).eq('monthKey', monthKey);
}

export async function getAllMonths(): Promise<MonthRecord[]> {
  const { data } = await supabase
    .from('months')
    .select('*')
    .order('monthKey', { ascending: false });

  return (data || []) as MonthRecord[];
}

/** Importa gastos en bulk — usado por el importador CSV */
export async function bulkImportExpenses(expenses: Omit<Expense, 'id'>[]): Promise<number> {
  const now = new Date().toISOString();
  const withTimestamps = expenses.map(e => ({
    ...e,
    createdAt: e.createdAt || now,
    updatedAt: now,
  }));

  const { data } = await supabase
    .from('expenses')
    .insert(withTimestamps)
    .select('id');

  return (data || []).length;
}

/** Exporta todos los datos como JSON (backup completo) */
export async function exportAllData() {
  const { data: months } = await supabase.from('months').select('*');
  const { data: expenses } = await supabase.from('expenses').select('*');
  return { months: months || [], expenses: expenses || [], exportedAt: new Date().toISOString() };
}

/** Importa un backup JSON completo */
export async function importBackup(data: { months: MonthRecord[]; expenses: Expense[] }) {
  // Meses: insertar si no existen
  for (const m of data.months) {
    const { data: existing } = await supabase
      .from('months')
      .select('id')
      .eq('monthKey', m.monthKey)
      .maybeSingle();

    if (!existing) {
      const { id: _, ...rest } = m;
      await supabase.from('months').insert(rest);
    }
  }

  // Gastos: insertar todos sin ID para evitar colisiones
  const expensesWithoutIds = data.expenses.map(({ id: _, ...rest }) => rest);
  if (expensesWithoutIds.length > 0) {
    await supabase.from('expenses').insert(expensesWithoutIds);
  }
}
