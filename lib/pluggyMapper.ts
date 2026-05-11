import { calcular } from './calculations';
import { diaSemana } from './formatters';
import type { PluggyInvestmentTransaction } from './pluggy';
import type { Ativo, TipoOp, Operacao } from './types';

function detectAtivo(name: string): Ativo | null {
  const u = name.toUpperCase();
  if (u.includes('WIN')) return 'WIN';
  if (u.includes('WDO') || u.includes('DOL')) return 'WDO';
  return null;
}

function wavgPrice(txns: PluggyInvestmentTransaction[]): number {
  const totalQty = txns.reduce((s, t) => s + t.quantity, 0);
  if (totalQty === 0) return 0;
  return txns.reduce((s, t) => s + t.value * t.quantity, 0) / totalQty;
}

type TradeGroup = {
  ativo: Ativo;
  date: string;
  buys: PluggyInvestmentTransaction[];
  sells: PluggyInvestmentTransaction[];
};

export function mapToOperacoes(
  transactions: PluggyInvestmentTransaction[],
  userId: string,
  capitalInicial: number,
  alvoMult: number,
): Omit<Operacao, 'id' | 'created_at'>[] {
  const eligible = transactions.filter(
    t => (t.type === 'BUY' || t.type === 'SELL') && detectAtivo(t.name) !== null,
  );

  const groups = new Map<string, TradeGroup>();
  for (const t of eligible) {
    const ativo = detectAtivo(t.name)!;
    const date = (t.tradeDate ?? t.date).split('T')[0];
    const key = `${date}_${ativo}`;
    if (!groups.has(key)) groups.set(key, { ativo, date, buys: [], sells: [] });
    const g = groups.get(key)!;
    (t.type === 'BUY' ? g.buys : g.sells).push(t);
  }

  const ops: Omit<Operacao, 'id' | 'created_at'>[] = [];

  for (const g of groups.values()) {
    if (!g.buys.length || !g.sells.length) continue;

    const sortByDate = (a: PluggyInvestmentTransaction, b: PluggyInvestmentTransaction) =>
      (a.tradeDate ?? a.date).localeCompare(b.tradeDate ?? b.date);

    const firstBuy  = [...g.buys].sort(sortByDate)[0];
    const firstSell = [...g.sells].sort(sortByDate)[0];
    const tipo: TipoOp =
      (firstBuy.tradeDate ?? firstBuy.date) <= (firstSell.tradeDate ?? firstSell.date)
        ? 'Compra'
        : 'Venda';

    const pe    = tipo === 'Compra' ? wavgPrice(g.buys)  : wavgPrice(g.sells);
    const saida = tipo === 'Compra' ? wavgPrice(g.sells) : wavgPrice(g.buys);

    const totalBuyQty  = g.buys.reduce((s, t) => s + t.quantity, 0);
    const totalSellQty = g.sells.reduce((s, t) => s + t.quantity, 0);
    const qtde = Math.min(totalBuyQty, totalSellQty);

    const calc = calcular({
      ativo: g.ativo, tipo,
      pe, stop: pe,
      saida, qtdeRP: 0, qtdeTotal: qtde,
      alvoMult, capital: capitalInicial,
    });

    ops.push({
      user_id:    userId,
      data:       g.date,
      dia_semana: diaSemana(g.date),
      ativo:      g.ativo,
      tipo,
      pe,
      stop:       pe,
      risco_pts:  null,
      alvo1:      null,
      qtde_rp:    0,
      qtde_total: qtde,
      qtde_final: qtde,
      saida,
      pts_final:  calc.ptsFinal,
      situacao:   calc.situacao,
      rs_final:   calc.rsFinal,
      pct_risco:  null,
      setup:      null,
      obs:        'Importado via Pluggy — preencha o Stop',
    });
  }

  return ops;
}
