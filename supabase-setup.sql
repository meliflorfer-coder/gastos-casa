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

-- Permitir acceso público (para uso personal sin auth)
alter table transactions enable row level security;

create policy "allow all" on transactions
  for all using (true) with check (true);
