-- ─── TYPES ──────────────────────────────────────────────────────────────────
create type public.role_type as enum ('estudante', 'admin');
create type public.ativo_type as enum ('WIN', 'WDO');
create type public.tipo_op as enum ('Compra', 'Venda');
create type public.situacao_type as enum ('Gain', 'Loss', 'PE');

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null default '',
  role       public.role_type not null default 'estudante',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Usuário lê próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuário atualiza próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admin lê todos os perfis"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Trigger: cria perfil automaticamente ao registrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── CONFIGURACOES ───────────────────────────────────────────────────────────
create table public.configuracoes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  capital          numeric(12,2) not null default 2000,
  risco_pct        numeric(5,4) not null default 0.01,
  mao_fixa         boolean not null default false,
  contratos_fixos  integer not null default 1,
  alvo_mult        numeric(5,2) not null default 1.0,
  unique (user_id)
);

alter table public.configuracoes enable row level security;

create policy "Usuário gerencia própria config"
  on public.configuracoes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── OPERACOES ───────────────────────────────────────────────────────────────
create table public.operacoes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  data         date not null,
  dia_semana   text not null,
  ativo        public.ativo_type not null,
  tipo         public.tipo_op not null,
  pe           numeric(10,2) not null,
  stop         numeric(10,2) not null,
  risco_pts    numeric(10,2),
  alvo1        numeric(10,2),
  qtde_rp      integer not null default 0,
  qtde_total   integer not null,
  qtde_final   integer,
  saida        numeric(10,2),
  pts_final    numeric(10,2),
  situacao     public.situacao_type,
  rs_final     numeric(12,2),
  pct_risco    numeric(8,6),
  setup        text,
  obs          text,
  created_at   timestamptz not null default now()
);

alter table public.operacoes enable row level security;

create policy "Usuário gerencia próprias operações"
  on public.operacoes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admin lê todas as operações"
  on public.operacoes for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Índice para performance
create index operacoes_user_data_idx on public.operacoes (user_id, data desc);

-- ─── STORAGE (avatars) ───────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Usuário faz upload do próprio avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    auth.uid()::text = split_part(name, '/', 1)
  );

create policy "Usuário atualiza próprio avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and
    auth.uid()::text = split_part(name, '/', 1)
  );

create policy "Avatar público para leitura"
  on storage.objects for select
  using (bucket_id = 'avatars');
