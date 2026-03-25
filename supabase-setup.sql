-- Crear tabla de transacciones
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  month varchar(7) not null,
  source_file text,
  card text,
  date text,
  description text,
  amount_ars decimal default 0,
  amount_usd decimal default 0,
  fx_rate decimal default 0,
  installment_number int,
  installment_total int,
  assignment text default 'ambos',
  has_iva boolean default false,
  include boolean default true
);

-- Columnas adicionales (ejecutar si no existen)
alter table transactions add column if not exists user_reviewed boolean default false;
alter table transactions add column if not exists category text;

-- Permitir acceso público (para uso personal sin auth)
alter table transactions enable row level security;

create policy "allow all" on transactions
  for all using (true) with check (true);

-- Tabla de meses (estado del cierre mensual y deuda anterior)
create table if not exists months (
  month varchar(7) primary key,
  status text default 'open' check (status in ('open', 'closed')),
  previous_debt_ars decimal default 0,
  previous_debt_usd decimal default 0,
  notes text,
  closed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table months enable row level security;

create policy "allow all" on months
  for all using (true) with check (true);
