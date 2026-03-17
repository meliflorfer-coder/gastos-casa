export type Assignment = 'ambos' | 'fede' | 'meli' | 'ignorar'

export const CATEGORIES = [
  '',
  'Supermercado',
  'Restaurantes',
  'Delivery',
  'Servicios',
  'Suscripciones',
  'Salud',
  'Farmacia',
  'Transporte',
  'Combustible',
  'Ropa',
  'Hogar',
  'Electrónica',
  'Entretenimiento',
  'Educación',
  'Viajes',
  'Seguros',
  'Impuestos',
  'Otros',
]

export interface Transaction {
  id?: string
  month: string
  source_file: string
  card: string
  date: string
  description: string
  amount_ars: number
  amount_usd: number
  fx_rate: number
  installment_number: number | null
  installment_total: number | null
  assignment: Assignment
  has_iva: boolean
  include: boolean
  user_reviewed?: boolean
  category?: string
}

export interface MonthlySummary {
  month: string
  fede_total: number
  meli_total: number
  shared_total: number
  iva_total: number
  carryover: number
  fede_final: number
  meli_final: number
}
