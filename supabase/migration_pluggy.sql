-- Armazena o itemId do Pluggy por usuário (1 conexão por usuário)
create table if not exists public.pluggy_connections (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  item_id    text not null,
  updated_at timestamptz not null default now()
);

alter table public.pluggy_connections enable row level security;

create policy "Usuário gerencia própria conexão Pluggy"
  on public.pluggy_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
