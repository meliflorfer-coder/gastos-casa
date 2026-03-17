import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const BASE = { source_file: 'importacion-historica', fx_rate: 0, has_iva: false, include: true, user_reviewed: true }

const TRANSACTIONS = [
  // ─── ENERO 2026-01 ───────────────────────────────────────────────
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Gastos manuales',     assignment: 'ambos', description: 'Expensas',               amount_ars: 671066.56, amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MC Galicia Fede',  assignment: 'fede',  description: 'Youtube',                amount_ars: 0,         amount_usd: 4.74,   installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MC Galicia Fede',  assignment: 'ambos', description: 'Ferro',                  amount_ars: 51210,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Debito Galicia Fede', assignment: 'ambos', description: 'Edesur',                 amount_ars: 32476.77,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Debito Galicia Fede', assignment: 'ambos', description: 'Verdura',                amount_ars: 6500,      amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Debito Galicia Fede', assignment: 'ambos', description: 'Polleria',               amount_ars: 19618,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Fede',assignment: 'ambos', description: 'Comedor Sta Brig',       amount_ars: 79010,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Fede',assignment: 'ambos', description: 'Santa brigida',          amount_ars: 98071.50,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Fede',assignment: 'fede',  description: 'Apple',                  amount_ars: 0,         amount_usd: 9.9,    installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Fede',assignment: 'ambos', description: 'Carrefour',              amount_ars: 18114.77,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Fede',assignment: 'fede',  description: 'Smiles',                 amount_ars: 7600,      amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Fede',assignment: 'ambos', description: 'Farmacity',              amount_ars: 6434.01,   amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Gastos manuales',     assignment: 'ambos', description: 'Gas',                    amount_ars: 64997.40,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Gastos manuales',     assignment: 'ambos', description: 'Seguro Depto',           amount_ars: 23121.15,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Debito Galicia Meli', assignment: 'ambos', description: 'Supremas varios',        amount_ars: 21099,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Debito Galicia Meli', assignment: 'meli',  description: 'Cumple Lari',            amount_ars: 92500,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Debito Galicia Meli', assignment: 'meli',  description: 'Varios',                 amount_ars: 15000,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Debito Galicia Meli', assignment: 'ambos', description: 'Bianca',                 amount_ars: 170500,    amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Debito Galicia Meli', assignment: 'ambos', description: 'Verdura Meli',           amount_ars: 225012,    amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Debito Galicia Meli', assignment: 'ambos', description: 'Marcela',                amount_ars: 120000,    amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Debito Galicia Meli', assignment: 'ambos', description: 'Internet IPLAN',         amount_ars: 37714.93,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'Debito Galicia Meli', assignment: 'ambos', description: 'Instalacion Cortina',    amount_ars: 350000,    amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'SMG CELLs',              amount_ars: 15012.39,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Coto',                   amount_ars: 389567.49, amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Jumbo',                  amount_ars: 17702.48,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Carniceria',             amount_ars: 19500,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Farmacity Meli',         amount_ars: 32636.38,  amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'fede',  description: 'Nafta Fede',             amount_ars: 76110,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Legem',                  amount_ars: 72300,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Huevos',                 amount_ars: 50080,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Juguetes',               amount_ars: 5417.84,   amount_usd: 0,      installment_number: 5,    installment_total: 9    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Cafe Martinez',          amount_ars: 17400,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Ferro colonia',          amount_ars: 275333.34, amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'La juvenil',             amount_ars: 41320,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'fede',  description: 'Cabify Fede',            amount_ars: 6513.88,   amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Pedidoya',               amount_ars: 29040,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'P milas',                amount_ars: 25500,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Carters',                amount_ars: 57048.34,  amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Grisino',                amount_ars: 24690,     amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MX Galicia Meli',  assignment: 'meli',  description: 'Cheeki',                 amount_ars: 35566.66,  amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MP Meli',          assignment: 'ambos', description: 'Varios Cocina',          amount_ars: 11948.67,  amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MP Meli',          assignment: 'fede',  description: 'Tapones Fede',           amount_ars: 6150,      amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Pinata',                 amount_ars: 5996.67,   amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Cajas',                  amount_ars: 7879.87,   amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Navidad',                amount_ars: 6606.18,   amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Mochila bano',           amount_ars: 18300,     amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Mayas Lari',             amount_ars: 18826.67,  amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Zapas converse lari',    amount_ars: 21633.43,  amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Cheeky',                 amount_ars: 29466.66,  amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Remeras lari blanca',    amount_ars: 11038.16,  amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-01', date: '2026-01-01', card: 'TC MP Meli',          assignment: 'ambos', description: 'Cubiertos bazar',        amount_ars: 12357.34,  amount_usd: 0,      installment_number: 2,    installment_total: 3    },

  // ─── FEBRERO 2026-02 ─────────────────────────────────────────────
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'Gastos manuales',     assignment: 'ambos', description: 'Expensas',               amount_ars: 671066.50, amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MC Galicia Fede',  assignment: 'fede',  description: 'Youtube',                amount_ars: 0,         amount_usd: 4.71,   installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MC Galicia Fede',  assignment: 'ambos', description: 'ABL',                    amount_ars: 337997.21, amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MC Galicia Fede',  assignment: 'ambos', description: 'Ferro',                  amount_ars: 45260,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'Debito Galicia Fede', assignment: 'ambos', description: 'Edesur',                 amount_ars: 169259.63, amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Fede',assignment: 'ambos', description: 'Santa brigida',          amount_ars: 405205,    amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Fede',assignment: 'fede',  description: 'Apple',                  amount_ars: 0,         amount_usd: 9.99,   installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Fede',assignment: 'ambos', description: 'Carrefour',              amount_ars: 10280,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Fede',assignment: 'fede',  description: 'Smiles',                 amount_ars: 7600,      amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Fede',assignment: 'ambos', description: 'Farmacity',              amount_ars: 6434.01,   amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Fede',assignment: 'ambos', description: 'Le pain',                amount_ars: 50500,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'Gastos manuales',     assignment: 'ambos', description: 'Gas',                    amount_ars: 61728.64,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'Gastos manuales',     assignment: 'ambos', description: 'Seguro Depto',           amount_ars: 23121.15,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'Debito Galicia Meli', assignment: 'ambos', description: 'Supremas varios',        amount_ars: 19444,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'Debito Galicia Meli', assignment: 'ambos', description: 'Pizza vicca',            amount_ars: 106000,    amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'Debito Galicia Meli', assignment: 'meli',  description: 'Varios',                 amount_ars: 3740,      amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'Debito Galicia Meli', assignment: 'ambos', description: 'Verdura',                amount_ars: 168037,    amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'Debito Galicia Meli', assignment: 'ambos', description: 'Marcela',                amount_ars: 104000,    amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'Debito Galicia Meli', assignment: 'ambos', description: 'Internet IPLAN',         amount_ars: 39337.38,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'SMG CELLs',              amount_ars: 15387.69,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Coto',                   amount_ars: 91625.21,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Carniceria',             amount_ars: 165385,    amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Legem',                  amount_ars: 21100,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Juguetes',               amount_ars: 5417.84,   amount_usd: 0,      installment_number: 6,    installment_total: 9    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Ferro colonia',          amount_ars: 275333.34, amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Pedidoya',               amount_ars: 89360,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Navidad',                amount_ars: 2434.66,   amount_usd: 0,      installment_number: 2,    installment_total: 6    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'P milas',                amount_ars: 18600,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Carters',                amount_ars: 57048.34,  amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Grisino',                amount_ars: 24690,     amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MX Galicia Meli',  assignment: 'meli',  description: 'Cheeky',                 amount_ars: 35566.66,  amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MX Galicia Meli',  assignment: 'meli',  description: 'Starbucks',              amount_ars: 20100,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MX Galicia Meli',  assignment: 'ambos', description: 'Jumbo Galicia',          amount_ars: 115216.17, amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Zapas stich',            amount_ars: 20799.67,  amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Crocs',                  amount_ars: 13800,     amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Vasos cumple',           amount_ars: 7496,      amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Bolsas souvenirs',       amount_ars: 13998.66,  amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Cotillon',               amount_ars: 11642.89,  amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'ambos', description: 'Varios harina',          amount_ars: 27226.74,  amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Caja pochoclo',          amount_ars: 16800,     amount_usd: 0,      installment_number: 1,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Pinata',                 amount_ars: 5996.67,   amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Cajas',                  amount_ars: 7879.87,   amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Navidad MP',             amount_ars: 6606.18,   amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Mochila bano',           amount_ars: 18300,     amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Mayas Lari',             amount_ars: 18826.67,  amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Remeras lari blanca',    amount_ars: 11038.16,  amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-02', date: '2026-02-01', card: 'TC MP Meli',          assignment: 'ambos', description: 'Cubiertos bazar',        amount_ars: 12357.34,  amount_usd: 0,      installment_number: 3,    installment_total: 3    },

  // ─── MARZO 2026-03 ───────────────────────────────────────────────
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'Gastos manuales',     assignment: 'ambos', description: 'Expensas',               amount_ars: 899699.56, amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MC Galicia Fede',  assignment: 'fede',  description: 'Youtube',                amount_ars: 0,         amount_usd: 4.71,   installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MC Galicia Fede',  assignment: 'ambos', description: 'ABL',                    amount_ars: 337997.21, amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Fede',assignment: 'fede',  description: 'Apple',                  amount_ars: 0,         amount_usd: 9.99,   installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Fede',assignment: 'ambos', description: 'Farmacity',              amount_ars: 6434.01,   amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'Gastos manuales',     assignment: 'ambos', description: 'Gas',                    amount_ars: 60642.10,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'Gastos manuales',     assignment: 'ambos', description: 'Seguro Depto',           amount_ars: 23121.15,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Dolares Viaje',          amount_ars: 0,         amount_usd: 300.03, installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'SMG CELLs',              amount_ars: 15818.55,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Coto',                   amount_ars: 16572.32,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Levis',                  amount_ars: 71866.70,  amount_usd: 0,      installment_number: 1,    installment_total: 6    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Adidas Silvia',          amount_ars: 65267.59,  amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Juguetes',               amount_ars: 5417.84,   amount_usd: 0,      installment_number: 7,    installment_total: 9    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Rustica y pan',          amount_ars: 63821,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'Legem',                  amount_ars: 26900,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Pedidoya',               amount_ars: 5990,      amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Navidad',                amount_ars: 2434.66,   amount_usd: 0,      installment_number: 3,    installment_total: 6    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Meli',assignment: 'ambos', description: 'P milas',                amount_ars: 18600,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Carters',                amount_ars: 57048.34,  amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC Visa Galicia Meli',assignment: 'meli',  description: 'Grisino',                amount_ars: 24690,     amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MX Galicia Meli',  assignment: 'meli',  description: 'Cheeky',                 amount_ars: 35566.66,  amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MX Galicia Meli',  assignment: 'meli',  description: 'Starbucks',              amount_ars: 20100,     amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MX Galicia Meli',  assignment: 'ambos', description: 'Jumbo Galicia',          amount_ars: 115216.17, amount_usd: 0,      installment_number: null, installment_total: null },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Zapas stich',            amount_ars: 20799.67,  amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Crocs',                  amount_ars: 13800,     amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Vasos cumple',           amount_ars: 7496,      amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Bolsas souvenirs',       amount_ars: 13998.66,  amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Cotillon',               amount_ars: 11642.89,  amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MP Meli',          assignment: 'ambos', description: 'Varios harina',          amount_ars: 27226.74,  amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Caja pochoclo',          amount_ars: 16800,     amount_usd: 0,      installment_number: 2,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Pinata',                 amount_ars: 5996.67,   amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Cajas',                  amount_ars: 7879.87,   amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Navidad MP',             amount_ars: 6606.18,   amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Mochila bano',           amount_ars: 18300,     amount_usd: 0,      installment_number: 3,    installment_total: 3    },
  { ...BASE, month: '2026-03', date: '2026-03-01', card: 'TC MP Meli',          assignment: 'meli',  description: 'Mayas Lari',             amount_ars: 18826.67,  amount_usd: 0,      installment_number: 3,    installment_total: 3    },
]

export async function POST() {
  // Verificar si ya fue importado
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('source_file', 'importacion-historica')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Los datos históricos ya fueron importados.' }, { status: 409 })
  }

  // Insertar en lotes
  for (let i = 0; i < TRANSACTIONS.length; i += 50) {
    const { error } = await supabase.from('transactions').insert(TRANSACTIONS.slice(i, i + 50))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const months = [...new Set(TRANSACTIONS.map(t => t.month))].sort()
  return NextResponse.json({ inserted: TRANSACTIONS.length, months })
}
