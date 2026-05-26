-- Adicionar campos OHLC, plano e ajustes ao diário
alter table public.diario_entradas
  add column if not exists ativo_ref  text    default 'WIN',
  add column if not exists abertura   numeric(10,2),
  add column if not exists maximo     numeric(10,2),
  add column if not exists minimo     numeric(10,2),
  add column if not exists fechamento numeric(10,2),
  add column if not exists plano_dia  text,
  add column if not exists ajustes    text;
