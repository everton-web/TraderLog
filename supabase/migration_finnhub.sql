-- Adiciona coluna finnhub_key na tabela bridge_config
-- Executar em: Supabase Dashboard → SQL Editor

ALTER TABLE bridge_config
  ADD COLUMN IF NOT EXISTS finnhub_key TEXT;
