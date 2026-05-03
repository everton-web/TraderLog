-- =============================================================
-- TraderLog — Supabase RPCs (SQL Editor)
-- Executa no SQL Editor do Supabase: https://supabase.com/dashboard/project/_/sql
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. get_trades_with_running_capital
--    Retorna todas as operações do usuário com colunas calculadas:
--    capital acumulado, topo (peak) e drawdown, usando Window Functions.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_trades_with_running_capital(p_user_id UUID)
RETURNS TABLE (
  id              UUID,
  data            TEXT,
  dia_semana      TEXT,
  ativo           TEXT,
  tipo            TEXT,
  pe              NUMERIC,
  stop            NUMERIC,
  risco_pts       NUMERIC,
  alvo1           NUMERIC,
  qtde_rp         INTEGER,
  qtde_total      INTEGER,
  qtde_final      INTEGER,
  saida           NUMERIC,
  pts_final       NUMERIC,
  situacao        TEXT,
  rs_final        NUMERIC,
  pct_risco       NUMERIC,
  setup           TEXT,
  obs             TEXT,
  created_at      TIMESTAMPTZ,
  -- Colunas calculadas
  capital_acumulado   NUMERIC,
  topo                NUMERIC,
  dd_rs               NUMERIC,
  dd_pct              NUMERIC,
  pct_risco_capital   NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH capital_inicial AS (
    SELECT COALESCE(capital, 2000) AS cap
    FROM configuracoes
    WHERE user_id = p_user_id
    LIMIT 1
  ),
  base AS (
    SELECT
      o.*,
      ci.cap AS cap_inicial,
      -- R$ acumulado sobre o capital inicial usando SUM como Window Function
      ci.cap + SUM(COALESCE(o.rs_final, 0))
        OVER (ORDER BY o.data, o.created_at
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS capital_acumulado,
      -- Capital anterior (para % risco)
      ci.cap + COALESCE(
        SUM(COALESCE(o.rs_final, 0))
          OVER (ORDER BY o.data, o.created_at
                ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),
        0
      ) AS capital_anterior
    FROM operacoes o, capital_inicial ci
    WHERE o.user_id = p_user_id
  ),
  com_topo AS (
    SELECT
      b.*,
      MAX(b.capital_acumulado)
        OVER (ORDER BY b.data, b.created_at
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS topo
    FROM base b
  )
  SELECT
    t.id,
    t.data,
    t.dia_semana,
    t.ativo,
    t.tipo,
    t.pe,
    t.stop,
    t.risco_pts,
    t.alvo1,
    t.qtde_rp,
    t.qtde_total,
    t.qtde_final,
    t.saida,
    t.pts_final,
    t.situacao,
    t.rs_final,
    t.pct_risco,
    t.setup,
    t.obs,
    t.created_at,
    ROUND(t.capital_acumulado, 2)                               AS capital_acumulado,
    ROUND(t.topo, 2)                                            AS topo,
    ROUND(GREATEST(t.topo - t.capital_acumulado, 0), 2)        AS dd_rs,
    CASE WHEN t.topo > 0
      THEN ROUND(GREATEST(t.topo - t.capital_acumulado, 0) / t.topo, 6)
      ELSE 0
    END                                                         AS dd_pct,
    CASE
      WHEN t.risco_pts IS NOT NULL AND t.capital_anterior > 0
      THEN ROUND(
        (t.risco_pts * t.qtde_total *
          CASE t.ativo WHEN 'WIN' THEN 0.20 ELSE 10.00 END
        ) / t.capital_anterior, 6)
      ELSE NULL
    END                                                         AS pct_risco_capital
  FROM com_topo t
  ORDER BY t.data ASC, t.created_at ASC;
$$;


-- ──────────────────────────────────────────────────────────────
-- 2. calculate_pam_stats
--    Estatísticas completas: Win Rate, Payoff, Expectativa, Drawdown Máximo
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_pam_stats(p_user_id UUID)
RETURNS TABLE (
  total_trades    INTEGER,
  gains           INTEGER,
  losses          INTEGER,
  pes             INTEGER,
  win_rate        NUMERIC,
  media_gain      NUMERIC,
  media_loss      NUMERIC,
  payoff          NUMERIC,
  expectativa     NUMERIC,
  max_dd_pct      NUMERIC,
  rs_total        NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH operacoes_validas AS (
    SELECT * FROM operacoes
    WHERE user_id = p_user_id AND situacao IS NOT NULL
  ),
  resumo AS (
    SELECT
      COUNT(*)                                          AS total_trades,
      COUNT(*) FILTER (WHERE situacao = 'Gain')        AS gains,
      COUNT(*) FILTER (WHERE situacao = 'Loss')        AS losses,
      COUNT(*) FILTER (WHERE situacao = 'PE')          AS pes,
      AVG(rs_final) FILTER (WHERE situacao = 'Gain')   AS media_gain,
      ABS(AVG(rs_final) FILTER (WHERE situacao = 'Loss')) AS media_loss,
      SUM(COALESCE(rs_final, 0))                       AS rs_total
    FROM operacoes_validas
  ),
  capital_base AS (
    SELECT COALESCE(capital, 2000) AS cap FROM configuracoes
    WHERE user_id = p_user_id LIMIT 1
  ),
  -- 1ª passagem: capital acumulado por linha (sem aninhamento)
  curva_cap AS (
    SELECT
      o.data,
      o.created_at,
      cb.cap + SUM(COALESCE(o.rs_final, 0))
        OVER (ORDER BY o.data, o.created_at
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cap_acc
    FROM operacoes o, capital_base cb
    WHERE o.user_id = p_user_id
  ),
  -- 2ª passagem: pico histórico sobre a coluna já calculada
  curva AS (
    SELECT
      cap_acc,
      MAX(cap_acc)
        OVER (ORDER BY data, created_at
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS topo
    FROM curva_cap
  ),
  -- Drawdown máximo agregado
  max_dd AS (
    SELECT MAX(CASE WHEN topo > 0 THEN (topo - cap_acc) / topo ELSE 0 END) AS max_dd_pct
    FROM curva
  )
  SELECT
    r.total_trades::INTEGER,
    r.gains::INTEGER,
    r.losses::INTEGER,
    r.pes::INTEGER,
    CASE WHEN r.total_trades > 0
      THEN ROUND(r.gains::NUMERIC / r.total_trades, 4)
      ELSE 0 END                                        AS win_rate,
    ROUND(r.media_gain, 2)                              AS media_gain,
    ROUND(r.media_loss, 2)                              AS media_loss,
    CASE WHEN NULLIF(r.media_loss, 0) IS NOT NULL
      THEN ROUND(r.media_gain / r.media_loss, 4)
      ELSE NULL END                                     AS payoff,
    CASE
      WHEN r.media_gain IS NOT NULL AND r.media_loss IS NOT NULL AND r.total_trades > 0
      THEN ROUND(
        (r.media_gain * (r.gains::NUMERIC / r.total_trades)) -
        (r.media_loss * (r.losses::NUMERIC / r.total_trades)),
        2)
      ELSE NULL
    END                                                 AS expectativa,
    ROUND(COALESCE(d.max_dd_pct, 0), 6)                AS max_dd_pct,
    ROUND(r.rs_total, 2)                                AS rs_total
  FROM resumo r, max_dd d;
$$;


-- ──────────────────────────────────────────────────────────────
-- 3. simulate_position_sizing
--    Simula as 5 curvas de capital usando PL/pgSQL loop.
--    Retorna JSON para o gráfico comparativo.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION simulate_position_sizing(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_capital_inicial   NUMERIC;
  v_delta             NUMERIC := 5000;

  -- Mão Fixa
  v_mf_cap            NUMERIC;

  -- Fixed Ratio
  v_fr_cap            NUMERIC;
  v_fr_contratos      INTEGER := 1;
  v_fr_lucro_nivel    NUMERIC := 0;

  -- Kelly
  v_ck_cap            NUMERIC;
  v_kelly_pct         NUMERIC;
  v_win_rate          NUMERIC;
  v_payoff            NUMERIC;

  v_rec               RECORD;
  v_tick              NUMERIC;
  v_rs_mf             NUMERIC;
  v_rs_fr             NUMERIC;
  v_rs_ck             NUMERIC;
  v_ck_contratos      INTEGER;
  v_risco_rs          NUMERIC;

  v_resultado         JSONB := '[]'::JSONB;
  v_mes_atual         TEXT := '';
BEGIN
  -- Capital inicial
  SELECT COALESCE(capital, 2000) INTO v_capital_inicial
  FROM configuracoes WHERE user_id = p_user_id LIMIT 1;

  v_mf_cap := v_capital_inicial;
  v_fr_cap := v_capital_inicial;
  v_ck_cap := v_capital_inicial;

  -- Pré-calcula Win Rate e Payoff para Kelly
  SELECT
    CASE WHEN COUNT(*) > 0
      THEN COUNT(*) FILTER (WHERE situacao = 'Gain')::NUMERIC / COUNT(*)
      ELSE 0 END,
    CASE WHEN NULLIF(ABS(AVG(rs_final) FILTER (WHERE situacao = 'Loss')), 0) IS NOT NULL
      THEN AVG(rs_final) FILTER (WHERE situacao = 'Gain') /
           ABS(AVG(rs_final) FILTER (WHERE situacao = 'Loss'))
      ELSE 0 END
  INTO v_win_rate, v_payoff
  FROM operacoes
  WHERE user_id = p_user_id AND situacao IS NOT NULL;

  -- Kelly% = (payoff × winRate − lossRate) / payoff, máx 25%
  IF v_payoff > 0 THEN
    v_kelly_pct := (v_payoff * v_win_rate - (1 - v_win_rate)) / v_payoff;
    v_kelly_pct := LEAST(GREATEST(v_kelly_pct, 0), 0.25);
  ELSE
    v_kelly_pct := 0;
  END IF;

  -- Loop cronológico pelas operações
  FOR v_rec IN
    SELECT data, ativo, pts_final, rs_final, risco_pts, qtde_total, situacao
    FROM operacoes
    WHERE user_id = p_user_id AND pts_final IS NOT NULL AND situacao IS NOT NULL
    ORDER BY data ASC, created_at ASC
  LOOP
    v_tick := CASE v_rec.ativo WHEN 'WIN' THEN 0.20 ELSE 10.00 END;

    -- Mão Fixa: usa rs_final original
    v_rs_mf := COALESCE(v_rec.rs_final, 0);
    v_mf_cap := v_mf_cap + v_rs_mf;

    -- Fixed Ratio
    v_rs_fr := COALESCE(v_rec.pts_final, 0) * v_fr_contratos * v_tick;
    v_fr_cap := v_fr_cap + v_rs_fr;
    v_fr_lucro_nivel := v_fr_lucro_nivel + v_rs_fr;
    IF v_fr_lucro_nivel >= v_delta * v_fr_contratos THEN
      v_fr_contratos := v_fr_contratos + 1;
      v_fr_lucro_nivel := 0;
    END IF;

    -- Kelly
    v_risco_rs := COALESCE(v_rec.risco_pts, 0) * v_tick;
    IF v_risco_rs > 0 AND v_kelly_pct > 0 THEN
      v_ck_contratos := GREATEST(1, FLOOR((v_ck_cap * v_kelly_pct) / v_risco_rs)::INTEGER);
    ELSE
      v_ck_contratos := 1;
    END IF;
    v_rs_ck := COALESCE(v_rec.pts_final, 0) * v_ck_contratos * v_tick;
    v_ck_cap := v_ck_cap + v_rs_ck;

    -- Snapshot mensal: grava quando mês muda ou no último trade do mês
    IF v_mes_atual <> LEFT(v_rec.data::TEXT, 7) THEN
      IF v_mes_atual <> '' THEN
        -- já gravamos ao mudar de mês (sobrescreve com o valor final do mês anterior)
        NULL;
      END IF;
      v_mes_atual := LEFT(v_rec.data::TEXT, 7);
    END IF;

    -- Atualiza o último ponto do mês (o loop sobrescreve até o último trade do mês)
    v_resultado := (
      SELECT jsonb_agg(entry) FROM (
        SELECT entry FROM jsonb_array_elements(v_resultado) AS entry
        WHERE entry->>'mes' <> v_mes_atual
        UNION ALL
        SELECT jsonb_build_object(
          'mes',        v_mes_atual,
          'maoFixa',    ROUND(v_mf_cap, 2),
          'fixedRatio', ROUND(v_fr_cap, 2),
          'kelly',      ROUND(v_ck_cap, 2),
          'hibrido1',   ROUND((v_mf_cap + v_fr_cap) / 2, 2),
          'hibrido2',   ROUND((v_mf_cap + v_ck_cap) / 2, 2)
        )
      ) sub
    );
  END LOOP;

  RETURN COALESCE(v_resultado, '[]'::JSONB);
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- Permissões
-- ──────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION get_trades_with_running_capital(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_pam_stats(UUID)             TO authenticated;
GRANT EXECUTE ON FUNCTION simulate_position_sizing(UUID)        TO authenticated;
