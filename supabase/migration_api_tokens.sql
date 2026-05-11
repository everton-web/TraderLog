-- Token pessoal para autenticação do bridge local (Profit DLL, etc.)
create table if not exists public.api_tokens (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      text not null unique default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now()
);

alter table public.api_tokens enable row level security;

create policy "Usuário gerencia próprio token"
  on public.api_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
