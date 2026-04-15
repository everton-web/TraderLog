-- ============================================================
--  TraderLog — Schema Supabase
--  Execute no SQL Editor do painel Supabase
-- ============================================================

-- ── PROFILES ────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  nome       text,
  role       text not null default 'estudante' check (role in ('estudante', 'admin')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Cria perfil automaticamente ao cadastrar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'estudante')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── CONFIGURAÇÕES ────────────────────────────────────────────
create table if not exists public.configuracoes (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users on delete cascade unique not null,
  capital          numeric not null default 2000,
  risco_pct        numeric not null default 3,
  mao_fixa         boolean not null default false,
  contratos_fixos  int     not null default 5,
  alvo_mult        numeric not null default 1.0,
  updated_at       timestamptz not null default now()
);

-- ── OPERAÇÕES ────────────────────────────────────────────────
create table if not exists public.operacoes (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users on delete cascade not null,
  data       date not null,
  dia_semana text,
  ativo      text not null check (ativo in ('WIN', 'WDO')),
  tipo       text not null check (tipo in ('Compra', 'Venda')),
  pe         numeric not null,
  stop       numeric not null,
  risco_pts  numeric,
  alvo1      numeric,
  qtde_rp    int not null default 0,
  qtde_total int not null,
  qtde_final int,
  saida      numeric,
  pts_final  numeric,
  situacao   text check (situacao in ('Gain', 'Loss', 'PE')),
  rs_final   numeric,
  pct_risco  numeric,
  setup      text,
  obs        text,
  created_at timestamptz not null default now()
);

create index if not exists idx_operacoes_user_data on public.operacoes (user_id, data);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.configuracoes  enable row level security;
alter table public.operacoes      enable row level security;

-- Profiles
create policy "own_profile_select" on public.profiles for select using (auth.uid() = id);
create policy "own_profile_update" on public.profiles for update using (auth.uid() = id);
create policy "admin_profiles_select" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Configurações
create policy "own_config" on public.configuracoes for all using (auth.uid() = user_id);

-- Operações
create policy "own_ops" on public.operacoes for all using (auth.uid() = user_id);
create policy "admin_ops_select" on public.operacoes for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── STORAGE: AVATARS ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict do nothing;

create policy "avatar_insert" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar_update" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

-- ── ADMIN INICIAL (opcional) ─────────────────────────────────
-- Para tornar um usuário admin, execute após o cadastro:
-- update public.profiles set role = 'admin' where id = '<uuid-do-usuario>';
