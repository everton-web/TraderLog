-- Configurações do bridge Profit Pro por usuário
create table if not exists public.bridge_config (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  profit_key   text,
  profit_email text,
  updated_at   timestamptz not null default now()
);

alter table public.bridge_config enable row level security;

drop policy if exists "Usuário gerencia própria config de bridge" on public.bridge_config;

create policy "Usuário gerencia própria config de bridge"
  on public.bridge_config for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
