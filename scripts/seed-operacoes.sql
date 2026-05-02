-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: 200 operações de teste
-- Execute no Supabase SQL Editor (https://supabase.com/dashboard > SQL Editor)
-- Para limpar depois: DELETE FROM public.operacoes WHERE setup = 'SEED';
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_user_id   uuid;
  v_capital   numeric := 10000;
  i           integer;
  v_data      date;
  v_dow       integer;
  v_dia_sem   text;
  v_ativo     text;
  v_tick      numeric;
  v_tipo      text;
  v_pe        numeric;
  v_stop      numeric;
  v_risco_pts numeric;
  v_alvo1     numeric;
  v_qtde_tot  integer;
  v_qtde_rp   integer;
  v_qtde_fin  integer;
  v_saida     numeric;
  v_pts_fin   numeric;
  v_situacao  text;
  v_rs_fin    numeric;
  v_pct_risco numeric;
  v_rand      float;
  v_setups    text[] := ARRAY['IFR2','Rompimento','Topo Duplo','Fundo Duplo','Bandeira','Pivô de Alta','Pivô de Baixa','Engolfo','Martelo','Estrela Cadente'];
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado. Faça login primeiro.';
  END IF;

  FOR i IN 1..200 LOOP
    -- Data aleatória nos últimos 12 meses
    v_data := CURRENT_DATE - (random() * 360)::integer;

    -- Pular fins de semana
    v_dow := EXTRACT(DOW FROM v_data)::integer;
    WHILE v_dow IN (0, 6) LOOP
      v_data := v_data - 1;
      v_dow  := EXTRACT(DOW FROM v_data)::integer;
    END LOOP;

    v_dia_sem := CASE v_dow
      WHEN 1 THEN 'SEGUNDA'
      WHEN 2 THEN 'TERÇA'
      WHEN 3 THEN 'QUARTA'
      WHEN 4 THEN 'QUINTA'
      WHEN 5 THEN 'SEXTA'
    END;

    -- Ativo: 65% WIN, 35% WDO
    IF random() < 0.65 THEN
      v_ativo := 'WIN';
      v_tick  := 0.20;
      -- PE: 120000 a 140000, múltiplo de 500
      v_pe := (120000 + ((random() * 40)::integer) * 500)::numeric;
      -- Risco: 200 a 600 pts, múltiplo de 100
      v_risco_pts := (200 + ((random() * 4)::integer) * 100)::numeric;
    ELSE
      v_ativo := 'WDO';
      v_tick  := 10.00;
      -- PE: 5200 a 5800, múltiplo de 5
      v_pe := (5200 + ((random() * 120)::integer) * 5)::numeric;
      -- Risco: 5 a 20 pts
      v_risco_pts := (5 + (random() * 15)::integer)::numeric;
    END IF;

    -- Direção
    v_tipo := CASE WHEN random() < 0.52 THEN 'Compra' ELSE 'Venda' END;

    v_stop  := CASE WHEN v_tipo = 'Compra' THEN v_pe - v_risco_pts ELSE v_pe + v_risco_pts END;
    v_alvo1 := CASE WHEN v_tipo = 'Compra' THEN v_pe + v_risco_pts ELSE v_pe - v_risco_pts END;

    -- Contratos: 1 a 5
    v_qtde_tot := 1 + (random() * 4)::integer;
    v_qtde_rp  := CASE WHEN random() < 0.25 AND v_qtde_tot > 1 THEN 1 ELSE 0 END;
    v_qtde_fin := v_qtde_tot - v_qtde_rp;

    -- Resultado: 56% Gain, 36% Loss, 8% PE
    v_rand := random();
    IF v_rand < 0.56 THEN
      v_situacao  := 'Gain';
      v_pts_fin   := ROUND((v_risco_pts * (0.7 + random() * 1.6))::numeric, 2);
      v_saida     := CASE WHEN v_tipo = 'Compra' THEN v_pe + v_pts_fin ELSE v_pe - v_pts_fin END;
    ELSIF v_rand < 0.92 THEN
      v_situacao  := 'Loss';
      v_pts_fin   := ROUND((-v_risco_pts * (0.6 + random() * 0.5))::numeric, 2);
      v_saida     := CASE WHEN v_tipo = 'Compra' THEN v_pe + v_pts_fin ELSE v_pe - v_pts_fin END;
    ELSE
      v_situacao  := 'PE';
      v_pts_fin   := 0;
      v_saida     := v_pe;
    END IF;

    v_rs_fin    := CASE WHEN v_situacao = 'PE' THEN 0 ELSE ROUND((v_pts_fin * v_qtde_tot * v_tick)::numeric, 2) END;
    v_pct_risco := ROUND(((v_risco_pts * v_qtde_tot * v_tick) / v_capital)::numeric, 6);

    INSERT INTO public.operacoes (
      user_id, data, dia_semana, ativo, tipo,
      pe, stop, risco_pts, alvo1,
      qtde_rp, qtde_total, qtde_final,
      saida, pts_final, situacao, rs_final, pct_risco,
      setup
    ) VALUES (
      v_user_id,
      v_data,
      v_dia_sem,
      v_ativo::public.ativo_type,
      v_tipo::public.tipo_op,
      v_pe, v_stop, v_risco_pts, v_alvo1,
      v_qtde_rp, v_qtde_tot, v_qtde_fin,
      ROUND(v_saida, 2), v_pts_fin,
      v_situacao::public.situacao_type,
      v_rs_fin, v_pct_risco,
      v_setups[1 + (random() * 9)::integer]
    );
  END LOOP;

  RAISE NOTICE '200 operações inseridas para o usuário %', v_user_id;
END;
$$;
