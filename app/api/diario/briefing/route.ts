import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const MERCADO_LABELS: Record<string, string> = {
  lateral:         'Lateral',
  tendencia_alta:  'Tendência de Alta',
  tendencia_baixa: 'Tendência de Baixa',
  volatil:         'Volátil',
};

const PLANO_LABELS: Record<string, string> = {
  sim: 'Sim', parcialmente: 'Parcialmente', nao: 'Não',
};

type Row = Record<string, unknown>;

function fmtOHLC(e: Row): string {
  const partes = [
    e.abertura   != null ? `Abertura: ${e.abertura}`   : null,
    e.maximo     != null ? `Máximo: ${e.maximo}`       : null,
    e.minimo     != null ? `Mínimo: ${e.minimo}`       : null,
    e.fechamento != null ? `Fechamento: ${e.fechamento}` : null,
  ].filter(Boolean);
  if (!partes.length) return 'OHLC não informado';
  const range = e.maximo != null && e.minimo != null
    ? ` | Range: ${(Number(e.maximo) - Number(e.minimo)).toFixed(0)} pts` : '';
  return partes.join(' | ') + range;
}

async function callGroq(apiKey: string, system: string, prompt: string, maxTokens = 900): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.6,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Groq error ${res.status}`);
  }
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

function ontemISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: cfg } = await supabase
    .from('bridge_config')
    .select('gemini_key')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!cfg?.gemini_key)
    return NextResponse.json({ error: 'Configure a API key do Groq em Integrações primeiro.' }, { status: 400 });

  interface CalEvent { country: string; event: string; impact: string; estimate: string | null; unit: string | null; }
  const body = await req.json().catch(() => ({})) as { data?: string; eventos?: CalEvent[] };
  const dataRef = body.data ?? ontemISO();
  const eventos = body.eventos ?? [];

  const [entradaRes, opsRes, historicoRes, recentesRes] = await Promise.allSettled([
    supabase.from('diario_entradas').select('*').eq('user_id', user.id).eq('data', dataRef).maybeSingle(),
    supabase.from('operacoes')
      .select('ativo, tipo, setup, pe, stop, saida, pts_final, rs_final, situacao')
      .eq('user_id', user.id).eq('data', dataRef).order('created_at'),
    supabase.from('diario_entradas')
      .select('data, mercado, atr_pts, adx_valor, resultado_pts, emocional, plano_seguido')
      .eq('user_id', user.id).lt('data', dataRef)
      .order('data', { ascending: false }).limit(5),
    supabase.from('operacoes')
      .select('situacao, rs_final')
      .eq('user_id', user.id)
      .gte('data', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
  ]);

  const entrada   = entradaRes.status  === 'fulfilled' ? entradaRes.value.data  as Row | null : null;
  const ops       = opsRes.status      === 'fulfilled' ? (opsRes.value.data       ?? [])        : [];
  const historico = historicoRes.status === 'fulfilled' ? (historicoRes.value.data ?? [])        : [];
  const recentes  = recentesRes.status  === 'fulfilled' ? (recentesRes.value.data  ?? [])        : [];

  const gains   = recentes.filter((o: Row) => o.situacao === 'Gain').length;
  const losses  = recentes.filter((o: Row) => o.situacao === 'Loss').length;
  const rsTotal = recentes.reduce((s: number, o: Row) => s + (Number(o.rs_final) || 0), 0);
  const acerto  = (gains + losses) > 0 ? ((gains / (gains + losses)) * 100).toFixed(1) : null;

  const opsTexto = ops.length
    ? ops.map((o: Row) =>
        `  ${o.ativo} ${o.tipo}${o.setup ? ` [${o.setup}]` : ''} | PE ${o.pe} → Saída ${o.saida ?? '—'} | ${o.pts_final != null ? `${Number(o.pts_final) > 0 ? '+' : ''}${o.pts_final} pts` : '—'} | ${o.situacao ?? '—'}`
      ).join('\n')
    : '  Nenhuma operação registrada';

  const historicoTexto = historico.length
    ? historico.map((e: Row) =>
        `  ${e.data} | ${e.mercado ? (MERCADO_LABELS[e.mercado as string] ?? e.mercado) : '—'} | ATR ${e.atr_pts ?? '—'} | ADX ${e.adx_valor ?? '—'} | Resultado: ${e.resultado_pts != null ? `${Number(e.resultado_pts) > 0 ? '+' : ''}${e.resultado_pts} pts` : '—'} | Emocional: ${e.emocional ?? '—'}/5`
      ).join('\n')
    : '  Sem histórico anterior';

  const system = `Você é um coach de trading especializado em day trading de mini índice (WIN) e mini dólar (WDO) na B3.
Seu papel agora é gerar um briefing MATINAL: analise os dados de ontem e oriente o trader para o pregão de HOJE.
Responda em português brasileiro. Use markdown simples (##, **, bullets). Seja conciso e objetivo.`;

  const calTexto = eventos.length > 0
    ? eventos.map(e => `  [${e.impact.toUpperCase()}] ${e.country} — ${e.event}${e.estimate != null ? ` | est: ${e.estimate}${e.unit ?? ''}` : ''}`).join('\n')
    : '  Nenhum evento relevante identificado';

  const prompt = `## REFERÊNCIA — ${dataRef}
${fmtOHLC(entrada ?? {})}
Ativo: ${entrada?.ativo_ref ?? 'WIN'} | Mercado: ${entrada?.mercado ? (MERCADO_LABELS[entrada.mercado as string] ?? entrada.mercado) : 'não informado'} | ATR: ${entrada?.atr_pts ?? '—'} pts | ADX: ${entrada?.adx_valor ?? '—'}
Resultado do dia: ${entrada?.resultado_pts != null ? `${Number(entrada.resultado_pts) > 0 ? '+' : ''}${entrada.resultado_pts} pts` : '—'}

Operações:
${opsTexto}

Plano seguido: ${entrada?.plano_seguido ? (PLANO_LABELS[entrada.plano_seguido as string] ?? entrada.plano_seguido) : '—'}
Emocional: ${entrada?.emocional ?? '—'}/5
O que foi diferente do plano: ${entrada?.ajustes ?? '—'}
Observações: ${entrada?.observacoes ?? '—'}

## CONTEXTO RECENTE (5 dias antes)
${historicoTexto}

## PERFORMANCE — últimos 30 dias
Taxa de acerto: ${acerto ?? '—'}% (${gains} G / ${losses} L) | Resultado: R$ ${rsTotal.toFixed(2)}

## CALENDÁRIO ECONÔMICO DE HOJE
${calTexto}

---

## SOLICITAÇÃO — Briefing matinal para HOJE

## O mercado ontem
Em 2-3 linhas: o que o mercado fez? Qual foi o contexto técnico (range, tendência, OHLC)?

## O que observar hoje
Com base no fechamento e range de ontem: que cenários são prováveis? Que níveis são chave? Seja específico — cite os preços.

## Gestão e foco
1-2 pontos práticos: armadilha comum para esse contexto, postura emocional recomendada.

Máximo 280 palavras. Cite os números reais dos dados. Nada genérico.`;

  try {
    const briefing = await callGroq(cfg.gemini_key, system, prompt);
    return NextResponse.json({ briefing, dataRef });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao chamar o Groq';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
