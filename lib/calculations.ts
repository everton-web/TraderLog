import type { CalcResult, Ativo, TipoOp, Situacao, Estatisticas, Operacao } from './types';

export const WIN_TICK = 0.20;
export const WDO_TICK = 10.00;
export const tickValue = (ativo: Ativo) => ativo === 'WIN' ? WIN_TICK : WDO_TICK;

export interface CalcInput {
  ativo: Ativo;
  tipo: TipoOp;
  pe: number | null;
  stop: number | null;
  qtdeRP: number;
  qtdeTotal: number;
  saida: number | null;
  alvoMult: number;
  capital: number;
}

export function calcular(input: CalcInput): CalcResult {
  const { ativo, tipo, pe, stop, qtdeRP, qtdeTotal, saida, alvoMult, capital } = input;
  const tick = tickValue(ativo);

  let riscoPts: number | null = null;
  if (pe !== null && stop !== null) riscoPts = Math.abs(pe - stop);

  let alvo1: number | null = null;
  if (pe !== null && riscoPts !== null) {
    const mult = alvoMult > 0 ? alvoMult : 1.0;
    alvo1 = tipo === 'Compra' ? pe + riscoPts * mult : pe - riscoPts * mult;
  }

  const qtdeFinal = qtdeTotal - qtdeRP;

  let ptsFinal: number | null = null;
  if (saida !== null && pe !== null)
    ptsFinal = tipo === 'Compra' ? saida - pe : pe - saida;

  let situacao: Situacao | null = null;
  if (ptsFinal !== null) {
    if (ptsFinal > 0) situacao = 'Gain';
    else if (ptsFinal < 0) situacao = 'Loss';
    else situacao = 'PE';
  }

  let rsFinal: number | null = null;
  if (ptsFinal !== null)
    rsFinal = situacao === 'PE' ? 0 : ptsFinal * qtdeTotal * tick;

  let pctRisco: number | null = null;
  if (riscoPts !== null && capital > 0)
    pctRisco = (riscoPts * qtdeTotal * tick) / capital;

  return { riscoPts, alvo1, qtdeFinal, ptsFinal, situacao, rsFinal, pctRisco };
}

export function calcEstatisticas(ops: Operacao[]): Estatisticas {
  const total  = ops.length;
  const gains  = ops.filter(o => o.situacao === 'Gain').length;
  const losses = ops.filter(o => o.situacao === 'Loss').length;
  const pes    = ops.filter(o => o.situacao === 'PE').length;
  const acerto = total > 0 ? gains / total : null;
  const rsTotal = ops.reduce((a, o) => a + (o.rs_final || 0), 0);

  const gainOps = ops.filter(o => o.situacao === 'Gain' && (o.rs_final || 0) > 0);
  const lossOps = ops.filter(o => o.situacao === 'Loss' && (o.rs_final || 0) < 0);

  const mediaGain = gainOps.length > 0
    ? gainOps.reduce((a, o) => a + (o.rs_final || 0), 0) / gainOps.length : null;
  const mediaLoss = lossOps.length > 0
    ? Math.abs(lossOps.reduce((a, o) => a + (o.rs_final || 0), 0) / lossOps.length) : null;
  const payoff = mediaGain != null && mediaLoss != null && mediaLoss > 0
    ? mediaGain / mediaLoss : null;

  return { total, gains, losses, pes, acerto, rsTotal, mediaGain, mediaLoss, payoff };
}

export function gerarCSV(ops: Operacao[]): string {
  const headers = ['#','Data','Dia','Ativo','Tipo','PE','Stop','Risco pts','Alvo 1','Qtde RP','Qtde Total','Saída','Pts Final','Qtde Final','Situação','R$ Final','% Risco','Setup','Obs'];
  const rows = ops.map((o, i) => [
    i + 1, o.data, o.dia_semana, o.ativo, o.tipo,
    o.pe, o.stop, o.risco_pts ?? '', o.alvo1 ?? '',
    o.qtde_rp, o.qtde_total, o.saida ?? '', o.pts_final ?? '',
    o.qtde_final ?? '', o.situacao ?? '', o.rs_final ?? '',
    o.pct_risco != null ? (o.pct_risco * 100).toFixed(2) + '%' : '',
    o.setup ?? '', o.obs ?? '',
  ]);
  return [headers, ...rows].map(r => r.join(';')).join('\n');
}
