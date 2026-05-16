-- Amplia precisão das colunas numéricas de configuracoes
-- risco_pct: numeric(5,4) permitia max 9.9999 → valores ≥ 10% causavam overflow
-- capital:   numeric(12,2) → numeric(15,2) por segurança

alter table public.configuracoes
  alter column risco_pct   type numeric(8,4)  using risco_pct::numeric(8,4),
  alter column capital     type numeric(15,2) using capital::numeric(15,2);
