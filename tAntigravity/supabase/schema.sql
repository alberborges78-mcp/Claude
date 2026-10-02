-- ==============================================================================
-- SCHEMA SUPABASE: AGENDAMENTO PARA MANICURE & NAIL DESIGNER
-- ==============================================================================

-- 1. Tabela de Perfis de Usuários (Clientes e Manicure/Admin)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text,
  role text default 'client' check (role in ('client', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Serviços Oferecidos
create table if not exists public.services (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  duration_minutes integer default 60 not null,
  price numeric(10,2) not null,
  category text default 'Unhas',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabela de Horários Bloqueados pela Manicure (Folgas, Almoço, Imprevistos)
create table if not exists public.blocked_slots (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  time_slot text not null, -- ex: '12:00', '13:00' ou 'ALL_DAY'
  reason text default 'Horário Indisponível',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabela de Agendamentos
create table if not exists public.appointments (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete set null,
  client_name text not null,
  client_phone text not null,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  service_price numeric(10,2) not null,
  date date not null,
  time_slot text not null, -- ex: '09:00', '10:00'
  status text default 'confirmed' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.appointments enable row level security;

-- Políticas de Leitura Pública
create policy "Servicos visiveis para todos" 
  on public.services for select using (true);

create policy "Horarios bloqueados visiveis para todos" 
  on public.blocked_slots for select using (true);

create policy "Agendamentos visiveis por horario para verificar vagas" 
  on public.appointments for select using (true);

-- Dados Iniciais (Seed de Serviços)
insert into public.services (name, description, duration_minutes, price, category)
values 
  ('Manicure Tradicional', 'Cuticulagem funda e esmaltação tradicional com acabamento impecável.', 60, 45.00, 'Unhas'),
  ('Esmaltação em Gel', 'Esmalte em gel curado em cabine LED/UV com brilho e durabilidade de até 20 dias.', 60, 75.00, 'Unhas'),
  ('Alongamento em Fibra de Vidro', 'Alongamento resistente com aspecto fino, natural e curvatura perfeita.', 120, 160.00, 'Alongamento'),
  ('Manutenção de Fibra / Gel', 'Reposição de produto, nivelamento e nova esmaltação.', 90, 110.00, 'Alongamento'),
  ('Spa dos Pés Completo', 'Higienização, esfoliação relaxante, hidratação profunda e massagem podal.', 60, 65.00, 'Spa'),
  ('Blindagem de Unhas Naturais', 'Camada protetora em gel que evita quebras e descamações nas unhas naturais.', 60, 80.00, 'Tratamento')
on conflict do nothing;
