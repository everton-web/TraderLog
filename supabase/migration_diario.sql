-- Adicionar chave do Google AI à tabela bridge_config
alter table public.bridge_config add column if not exists gemini_key text;

-- Tabela de entradas do diário do trader
create table if not exists public.diario_entradas (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  data                date not null default current_date,
  mercado             text check (mercado in ('lateral', 'tendencia_alta', 'tendencia_baixa', 'volatil')),
  atr_pts             integer,
  adx_valor           integer,
  operacoes           text,
  plano_seguido       text check (plano_seguido in ('sim', 'parcialmente', 'nao')),
  emocional           integer check (emocional between 1 and 5),
  observacoes         text,
  resultado_pts       integer,
  analise_ia          text,
  analise_gerada_em   timestamptz,
  created_at          timestamptz not null default now(),
  unique (user_id, data)
);

alter table public.diario_entradas enable row level security;

create policy "Usuário gerencia próprio diário"
  on public.diario_entradas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
