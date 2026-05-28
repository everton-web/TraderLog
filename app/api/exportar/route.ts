import { createClient } from '@/utils/supabase/server';
import { calcEstatisticas } from '@/lib/calculations';
import type { Operacao } from '@/lib/types';
import { getAmbiente } from '@/lib/ambiente';

const MERCADO_LABEL: Record<string, string> = {
  lateral:         'Lateral',
  tendencia_alta:  'Tendência Alta',
  tendencia_baixa: 'Tendência Baixa',
  volatil:         'Volátil',
};

const PLANO_LABEL: Record<string, string> = {
  sim:          'Sim',
  parcialmente: 'Parcialmente',
  nao:          'Não',
};

const EMOCIONAL_LABEL: Record<number, string> = {
  1: 'Péssimo', 2: 'Ruim', 3: 'Neutro', 4: 'Bom', 5: 'Excelente',
};

function fmtRS(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(v: number) {
  return (v * 100).toFixed(1) + '%';
}

function datePT(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function buildMarkdown(
  data: string,
  entrada: Record<string, unknown> | null,
  ops: Operacao[],
  recentOps: Operacao[],
  traderName: string,
): string {
  const lines: string[] = [];

  lines.push(`# Diário de Trading — ${datePT(data)}`);
  lines.push(`**Trader:** ${traderName}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Contexto de mercado
  lines.push('## Contexto de Mercado');
  if (entrada?.ativo_ref) lines.push(`- **Ativo de referência:** ${entrada.ativo_ref}`);
  if (entrada?.mercado)   lines.push(`- **Tipo:** ${MERCADO_LABEL[entrada.mercado as string] ?? entrada.mercado}`);
  if (entrada?.atr_pts)   lines.push(`- **ATR:** ${entrada.atr_pts} pts`);
  if (entrada?.adx_valor) lines.push(`- **ADX:** ${entrada.adx_valor}`);
  const temOHLC = entrada?.abertura || entrada?.maximo || entrada?.minimo || entrada?.fechamento;
  if (temOHLC) {
    const ab = entrada?.abertura   as number | null;
    const mx = entrada?.maximo     as number | null;
    const mn = entrada?.minimo     as number | null;
    const fc = entrada?.fechamento as number | null;
    const range = mx != null && mn != null ? ` | Range: ${(mx - mn).toFixed(0)} pts` : '';
    lines.push(`- **AMMF:** A: ${ab ?? '—'} | M: ${mx ?? '—'} | m: ${mn ?? '—'} | F: ${fc ?? '—'}${range}`);
  }
  if (!entrada?.mercado && !entrada?.atr_pts && !entrada?.adx_valor && !temOHLC) lines.push('*Não preenchido*');
  lines.push('');

  // Plano do dia
  lines.push('## Plano do Dia');
  const planoDia = entrada?.plano_dia as string | null;
  lines.push(planoDia?.trim() ? planoDia.trim() : '*Não preenchido*');
  lines.push('');

  // Operações
  lines.push(`## Operações do Dia (${ops.length})`);
  if (ops.length > 0) {
    lines.push('| # | Ativo | Tipo | Setup | PE | Stop | Saída | Pts | Situação | R$ | Observações |');
    lines.push('|---|-------|------|-------|----|------|-------|-----|----------|----|-------------|');
    ops.forEach((op, i) => {
      const pts = op.pts_final != null ? `${op.pts_final > 0 ? '+' : ''}${op.pts_final}` : '—';
      const rs  = op.rs_final  != null ? fmtRS(op.rs_final) : '—';
      lines.push(`| ${i + 1} | ${op.ativo} | ${op.tipo} | ${op.setup ?? '—'} | ${op.pe} | ${op.stop ?? '—'} | ${op.saida ?? '—'} | ${pts} | ${op.situacao ?? '—'} | ${rs} | ${op.obs ?? '—'} |`);
    });
    lines.push('');
    const totalPts = ops.reduce((a, o) => a + (o.pts_final ?? 0), 0);
    const totalRS  = ops.reduce((a, o) => a + (o.rs_final  ?? 0), 0);
    lines.push(`**Resultado do dia:** ${totalPts >= 0 ? '+' : ''}${totalPts} pts | ${fmtRS(totalRS)}`);
  } else {
    lines.push('*Nenhuma operação registrada.*');
  }
  lines.push('');

  // Pós-mercado
  lines.push('## Reflexão Pós-Mercado');
  if (entrada?.plano_seguido) lines.push(`- **Plano seguido:** ${PLANO_LABEL[entrada.plano_seguido as string] ?? entrada.plano_seguido}`);
  if (entrada?.emocional) lines.push(`- **Estado emocional:** ${entrada.emocional}/5 — ${EMOCIONAL_LABEL[entrada.emocional as number] ?? ''}`);
  const ajustes    = entrada?.ajustes    as string | null;
  const observacoes = entrada?.observacoes as string | null;
  if (ajustes?.trim())    lines.push(`- **Divergências do plano:** ${ajustes.trim()}`);
  if (observacoes?.trim()) lines.push(`- **Observações:** ${observacoes.trim()}`);
  if (!entrada?.plano_seguido && !entrada?.emocional && !ajustes && !observacoes) lines.push('*Não preenchido*');
  lines.push('');

  // Análise IA
  const analise = entrada?.analise_ia as string | null;
  if (analise?.trim()) {
    lines.push('## Análise IA (Gemini)');
    lines.push(analise.trim());
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Performance últimos 30 dias
  lines.push('## Performance — Últimos 30 Dias');
  if (recentOps.length > 0) {
    const est = calcEstatisticas(recentOps);
    lines.push('| Métrica | Valor |');
    lines.push('|---------|-------|');
    lines.push(`| Operações | ${est.total} |`);
    lines.push(`| Gains / Losses / PEs | ${est.gains} / ${est.losses} / ${est.pes} |`);
    if (est.acerto != null) lines.push(`| Win Rate | ${fmtPct(est.acerto)} |`);
    lines.push(`| Resultado Total | ${fmtRS(est.rsTotal)} |`);
    if (est.mediaGain != null) lines.push(`| Média Gain | ${fmtRS(est.mediaGain)} |`);
    if (est.mediaLoss != null) lines.push(`| Média Loss | ${fmtRS(est.mediaLoss)} |`);
    if (est.payoff != null)    lines.push(`| Payoff | ${est.payoff.toFixed(2)} |`);
    if (est.expectativa != null) lines.push(`| Expectativa | ${fmtRS(est.expectativa)} |`);
    if (est.drawdown != null)  lines.push(`| Drawdown máx | ${fmtPct(est.drawdown)} |`);
    lines.push('');

    // Histórico por dia (últimas 10 entradas únicas)
    const diasMap: Record<string, { gains: number; losses: number; pts: number; rs: number }> = {};
    recentOps.forEach(o => {
      if (!diasMap[o.data]) diasMap[o.data] = { gains: 0, losses: 0, pts: 0, rs: 0 };
      if (o.situacao === 'Gain')  diasMap[o.data].gains++;
      if (o.situacao === 'Loss')  diasMap[o.data].losses++;
      diasMap[o.data].pts += o.pts_final ?? 0;
      diasMap[o.data].rs  += o.rs_final  ?? 0;
    });

    const dias = Object.keys(diasMap).sort((a, b) => b.localeCompare(a)).slice(0, 10);
    if (dias.length > 0) {
      lines.push('### Histórico Recente (últimos 10 pregões)');
      lines.push('| Data | Gains | Losses | Pts | R$ |');
      lines.push('|------|-------|--------|-----|----|');
      dias.forEach(d => {
        const r = diasMap[d];
        const pts = `${r.pts >= 0 ? '+' : ''}${r.pts}`;
        lines.push(`| ${d} | ${r.gains} | ${r.losses} | ${pts} | ${fmtRS(r.rs)} |`);
      });
    }
  } else {
    lines.push('*Nenhuma operação nos últimos 30 dias.*');
  }

  return lines.join('\n');
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const url  = new URL(req.url);
  const data = url.searchParams.get('data') || new Date().toISOString().split('T')[0];
  const ambiente = await getAmbiente();

  const [entradaRes, opsRes, recentRes, profileRes] = await Promise.allSettled([
    supabase.from('diario_entradas').select('*').eq('user_id', user.id).eq('data', data).maybeSingle(),
    supabase.from('operacoes').select('*').eq('user_id', user.id).eq('data', data).eq('ambiente', ambiente).order('created_at'),
    supabase.from('operacoes').select('*').eq('user_id', user.id).eq('ambiente', ambiente)
      .gte('data', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('data', { ascending: false }),
    supabase.from('profiles').select('nome').eq('id', user.id).single(),
  ]);

  const entrada    = entradaRes.status  === 'fulfilled' ? entradaRes.value.data  as Record<string, unknown> | null : null;
  const ops        = opsRes.status      === 'fulfilled' ? (opsRes.value.data      as Operacao[] ?? []) : [];
  const recentOps  = recentRes.status   === 'fulfilled' ? (recentRes.value.data   as Operacao[] ?? []) : [];
  const traderName = profileRes.status  === 'fulfilled' ? (profileRes.value.data?.nome ?? 'Trader') : 'Trader';

  const md = buildMarkdown(data, entrada, ops, recentOps, traderName);

  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="diario-${data}.md"`,
    },
  });
}
