-- Execute este arquivo no SQL Editor do Supabase uma única vez.
create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  orders jsonb not null default '[]'::jsonb,
  stock jsonb not null default '[]'::jsonb,
  user_role text not null default 'admin',
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "Usuário lê somente os próprios dados" on public.app_state;
create policy "Usuário lê somente os próprios dados"
on public.app_state for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Usuário cria somente os próprios dados" on public.app_state;
create policy "Usuário cria somente os próprios dados"
on public.app_state for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Usuário altera somente os próprios dados" on public.app_state;
create policy "Usuário altera somente os próprios dados"
on public.app_state for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Usuário exclui somente os próprios dados" on public.app_state;
create policy "Usuário exclui somente os próprios dados"
on public.app_state for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists app_state_updated_at_idx on public.app_state(updated_at desc);
