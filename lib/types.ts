export type Role = 'estudante' | 'admin';
export type Ativo = 'WIN' | 'WDO';
export type TipoOp = 'Compra' | 'Venda';
export type Situacao = 'Gain' | 'Loss' | 'PE';

export interface Profile {
  id: string;
  nome: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
}

export interface Configuracao {
  id: string;
  user_id: string;
  capital: number;
  risco_pct: number;
  mao_fixa: boolean;
  contratos_fixos: number;
  alvo_mult: number;
}

export interface Operacao {
  id: string;
  user_id: string;
  data: string;
  dia_semana: string;
  ativo: Ativo;
  tipo: TipoOp;
  pe: number;
  stop: number;
  risco_pts: number | null;
  alvo1: number | null;
  qtde_rp: number;
  qtde_total: number;
  qtde_final: number | null;
  saida: number | null;
  pts_final: number | null;
  situacao: Situacao | null;
  rs_final: number | null;
  pct_risco: number | null;
  setup: string | null;
  obs: string | null;
  created_at: string;
}

export interface CalcResult {
  riscoPts: number | null;
  alvo1: number | null;
  qtdeFinal: number;
  ptsFinal: number | null;
  situacao: Situacao | null;
  rsFinal: number | null;
  pctRisco: number | null;
}

export interface Estatisticas {
  total: number;
  gains: number;
  losses: number;
  pes: number;
  acerto: number | null;
  rsTotal: number;
  mediaGain: number | null;
  mediaLoss: number | null;
  payoff: number | null;
  expectativa: number | null;
  drawdown: number | null;
}

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
