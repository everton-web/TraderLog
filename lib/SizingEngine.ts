import { tickValue } from './calculations';
import type { Operacao } from './types';

export interface RowEnriquecida {
  op: Operacao;
  seq: number;
  capitalAnterior: number;
  capitalAcumulado: number;
  topo: number;
  ddRS: number;
  ddPct: number;
  pctRiscoCapital: number | null;
}

export interface SizingCapitais {
  mes: string;
  maoFixa: number;
  fixedRatio: number;
  kelly: number;
  hibrido1: number;
  hibrido2: number;
}

/**
 * Enriquece cada linha com capital acumulado, pico histórico e drawdown.
 * Recebe ops em ordem CRESCENTE (cronológica).
 */
export function enriquecerLinhas(
  ops: Operacao[],
  capitalInicial: number,
): RowEnriquecida[] {
  let capital = capitalInicial;
  let topo = capitalInicial;

  return ops.map((op, i) => {
    const capitalAnterior = capital;
    capital = capital + (op.rs_final ?? 0);
    if (capital > topo) topo = capital;

    const ddRS = capital < topo ? topo - capital : 0;
    const ddPct = topo > 0 ? ddRS / topo : 0;

    const tick = tickValue(op.ativo);
    const pctRiscoCapital =
      op.risco_pts != null && capitalAnterior > 0
        ? (op.risco_pts * op.qtde_total * tick) / capitalAnterior
        : null;

    return {
      op,
      seq: i + 1,
      capitalAnterior,
      capitalAcumulado: capital,
      topo,
      ddRS,
      ddPct,
      pctRiscoCapital,
    };
  });
}

// ─── Simuladores internos ──────────────────────────────────────────────────

function simMaoFixa(ops: Operacao[], capitalInicial: number): number[] {
  let capital = capitalInicial;
  return ops.map(op => {
    capital += op.rs_final ?? 0;
    return capital;
  });
}

function simFixedRatio(ops: Operacao[], capitalInicial: number, delta: number): number[] {
  let capital = capitalInicial;
  let contratos = 1;
  let lucroNivel = 0; // lucro acumulado desde o último escalonamento

  return ops.map(op => {
    const tick = tickValue(op.ativo);
    const pts = op.pts_final ?? 0;
    const rsOp = pts * contratos * tick;

    capital += rsOp;
    lucroNivel += rsOp;

    // Escala quando o lucro acumulado no nível atual atinge delta × contratos_atuais
    if (lucroNivel >= delta * contratos) {
      contratos++;
      lucroNivel = 0;
    }

    return capital;
  });
}

function simKelly(
  ops: Operacao[],
  capitalInicial: number,
  winRate: number,
  payoff: number,
): number[] {
  const lossRate = 1 - winRate;
  // Kelly% = (payoff × winRate − lossRate) / payoff, limitado a 0–25%
  let kellyPct = payoff > 0 ? (payoff * winRate - lossRate) / payoff : 0;
  kellyPct = Math.min(Math.max(kellyPct, 0), 0.25);

  let capital = capitalInicial;
  return ops.map(op => {
    const tick = tickValue(op.ativo);
    const riscoRS = (op.risco_pts ?? 0) * tick;
    const contratos = riscoRS > 0 ? Math.max(1, Math.floor((capital * kellyPct) / riscoRS)) : 1;
    capital += (op.pts_final ?? 0) * contratos * tick;
    return capital;
  });
}

// ─── Simulador principal ───────────────────────────────────────────────────

export function simularPositionSizing(
  ops: Operacao[],
  capitalInicial: number,
  delta = 5000,
): SizingCapitais[] {
  const validas = ops.filter(o => o.pts_final != null && o.situacao !== null);
  if (validas.length === 0) return [];

  // Estatísticas para Kelly
  const gainOps = validas.filter(o => o.situacao === 'Gain');
  const lossOps = validas.filter(o => o.situacao === 'Loss');
  const winRate = validas.length > 0 ? gainOps.length / validas.length : 0;
  const mediaGain = gainOps.length > 0
    ? gainOps.reduce((a, o) => a + (o.rs_final ?? 0), 0) / gainOps.length : 0;
  const mediaLoss = lossOps.length > 0
    ? Math.abs(lossOps.reduce((a, o) => a + (o.rs_final ?? 0), 0) / lossOps.length) : 1;
  const payoff = mediaLoss > 0 ? mediaGain / mediaLoss : 0;

  const mfCaps  = simMaoFixa(validas, capitalInicial);
  const frCaps  = simFixedRatio(validas, capitalInicial, delta);
  const ckCaps  = simKelly(validas, capitalInicial, winRate, payoff);
  const hb1Caps = mfCaps.map((v, i) => (v + frCaps[i]) / 2);
  const hb2Caps = mfCaps.map((v, i) => (v + ckCaps[i]) / 2);

  const meses = [...new Set(validas.map(o => o.data.slice(0, 7)))].sort();

  return meses.map(mes => {
    const lastIdx = validas.reduce<number>((acc, o, i) =>
      o.data.startsWith(mes) ? i : acc, -1);
    return {
      mes,
      maoFixa:    lastIdx >= 0 ? mfCaps[lastIdx]  : capitalInicial,
      fixedRatio: lastIdx >= 0 ? frCaps[lastIdx]  : capitalInicial,
      kelly:      lastIdx >= 0 ? ckCaps[lastIdx]  : capitalInicial,
      hibrido1:   lastIdx >= 0 ? hb1Caps[lastIdx] : capitalInicial,
      hibrido2:   lastIdx >= 0 ? hb2Caps[lastIdx] : capitalInicial,
    };
  });
}
