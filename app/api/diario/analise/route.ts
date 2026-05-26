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

type EntradaRow = Record<string, unknown>;

function fmtOHLC(e: EntradaRow): string {
  const ativo = e.ativo_ref ?? 'WIN';
  const partes = [
    e.abertura   != null ? `Abertura: ${e.abertura}`   : null,
    e.maximo     != null ? `Máximo: ${e.maximo}`       : null,
    e.minimo     != null ? `Mínimo: ${e.minimo}`       : null,
    e.fechamento != null ? `Fechamento: ${e.fechamento}` : null,
  ].filter(Boolean);
  if (!partes.length) return `${ativo}: sem dados OHLC`;
  const range = e.maximo != null && e.minimo != null
    ? ` (range: ${(Number(e.maximo) - Number(e.minimo)).toFixed(0)} pts)` : '';
  return `${ativo} | ${partes.join(' | ')}${range}`;
}

function fmtEntradaHistorico(e: EntradaRow): string {
  return [
    `DATA: ${e.data}`,
    fmtOHLC(e),
    `Mercado: ${e.mercado ? (MERCADO_LABELS[e.mercado as string] ?? e.mercado) : '-'} | ATR: ${e.atr_pts ?? '-'} pts | ADX: ${e.adx_valor ?? '-'}`,
    `Plano: ${e.plano_dia ?? '-'}`,
    `Ajustes: ${e.ajustes ?? '-'}`,
    `Plano seguido: ${e.plano_seguido ? (PLANO_LABELS[e.plano_seguido as string] ?? e.plano_seguido) : '-'} | Emocional: ${e.emocional ?? '-'}/5`,
    `Resultado: ${e.resultado_pts != null ? `${Number(e.resultado_pts) > 0 ? '+' : ''}${e.resultado_pts} pts` : '-'}`,
  ].join('\n');
}

async function callGroq(apiKey: string, system: string, prompt: string, maxTokens = 1200): Promise<string> {
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
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Groq error ${res.status}`);
  }
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
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

  if (!cfg?.gemini_key) {
    return NextResponse.json(
      { error: 'Configure a API key do Groq em Integrações primeiro.' },
      { status: 400 }
    );
  }

  const { entrada } = await req.json() as { entrada: EntradaRow };
  const dataHoje = entrada.data as string;

  const { data: opsHoje } = await supabase
    .from('operacoes')
    .select('ativo, tipo, setup, pe, stop, saida, pts_final, rs_final, situacao, obs')
    .eq('user_id', user.id)
    .eq('data', dataHoje)
    .order('created_at');

  const { data: historico } = await supabase
    .from('diario_entradas')
    .select('*')
    .eq('user_id', user.id)
    .neq('data', dataHoje)
    .order('data', { ascending: false })
    .limit(10);

  const trinta = new Date();
  trinta.setDate(trinta.getDate() - 30);
  const { data: opsRecentes } = await supabase
    .from('operacoes')
    .select('data, situacao, rs_final, pts_final')
    .eq('user_id', user.id)
    .gte('data', trinta.toISOString().split('T')[0])
    .order('data', { ascending: false });

  const totalOps  = opsRecentes?.length ?? 0;
  const gains     = opsRecentes?.filter(o => o.situacao === 'Gain').length ?? 0;
  const losses    = opsRecentes?.filter(o => o.situacao === 'Loss').length ?? 0;
  const rsTotal   = opsRecentes?.reduce((s, o) => s + (o.rs_final ?? 0), 0) ?? 0;
  const acerto    = (gains + losses) > 0 ? ((gains / (gains + losses)) * 100).toFixed(1) : null;

  let streak = 0;
  let streakTipo = '';
  if (opsRecentes?.length) {
    const ultima = opsRecentes[0].situacao;
    if (ultima === 'Gain' || ultima === 'Loss') {
      streakTipo = ultima;
      for (const op of opsRecentes) {
        if (op.situacao === ultima) streak++;
        else break;
      }
    }
  }

  const ontem = historico?.[0];

  const opsTexto = opsHoje?.length
    ? opsHoje.map(o =>
        `  ${o.ativo} ${o.tipo}${o.setup ? ` [${o.setup}]` : ''} | PE ${o.pe} → Saída ${o.saida} | ${o.pts_final != null ? `${o.pts_final > 0 ? '+' : ''}${o.pts_final} pts` : '—'} | ${o.situacao ?? '—'}${o.obs ? ` | ${o.obs}` : ''}`
      ).join('\n')
    : '  Nenhuma operação registrada';

  const system = `Você é um coach de trading especializado em day trading de mini índice (WIN) e mini dólar (WDO) na B3.
Analise o diário do trader com profundidade e forneça insights práticos, diretos e personalizados.
Responda sempre em português brasileiro. Use markdown simples (##, **, bullet points).
Seja específico: cite números, padrões e situações reais dos dados fornecidos.`;

  const prompt = `Analise o diário de trading e gere um briefing completo para o próximo pregão.

## HOJE — ${dataHoje}
${fmtOHLC(entrada)}
Mercado: ${entrada.mercado ? (MERCADO_LABELS[entrada.mercado as string] ?? entrada.mercado) : 'não informado'} | ATR: ${entrada.atr_pts ?? '-'} pts | ADX: ${entrada.adx_valor ?? '-'}

**Plano do dia:**
${entrada.plano_dia || 'Não informado'}

**Operações executadas:**
${opsTexto}

**O que foi ajustado vs. plano:**
${entrada.ajustes || 'Não informado'}

**Plano seguido:** ${entrada.plano_seguido ? (PLANO_LABELS[entrada.plano_seguido as string] ?? entrada.plano_seguido) : '-'}
**Emocional:** ${entrada.emocional ?? '-'}/5
**Observações:** ${entrada.observacoes || '-'}

---

## ONTEM${ontem ? ` — ${ontem.data}` : ' — sem registro'}
${ontem ? fmtEntradaHistorico(ontem as EntradaRow) : 'Nenhuma entrada registrada ontem.'}

---

## ONDE ESTOU (últimos 30 dias)
- Total de operações: ${totalOps}
- Taxa de acerto: ${acerto ?? '—'}% (${gains} gains / ${losses} losses)
- Resultado acumulado: R$ ${rsTotal.toFixed(2)}
- Sequência atual: ${streak > 1 ? `${streak} ${streakTipo === 'Gain' ? 'gains' : 'losses'} consecutivos` : 'sem sequência relevante'}

---

## HISTÓRICO RECENTE (diário)
${historico?.slice(0, 5).map(e => fmtEntradaHistorico(e as EntradaRow)).join('\n\n---\n\n') || 'Sem histórico.'}

---

## SOLICITAÇÃO
Analise os dados acima e forneça:

## 1. Análise do dia
Compare hoje com ontem (OHLC, range, contexto). O que o mercado fez? O que funcionou nas operações?

## 2. Plano vs. Execução
Como foi a aderência ao plano? O que divergiu e por quê?

## 3. Onde estou
Avalie o momento atual do trader (sequência, desempenho, risco emocional). Seja honesto.

## 4. O que ajustar
Máx. 3 ajustes concretos e mensuráveis para os próximos pregões.

## 5. Amanhã
Com base nos dados OHLC de hoje, o que observar/esperar? Níveis importantes, contexto provável.

Máximo 500 palavras. Seja direto e específico — cite os números dos dados.`;

  try {
    const analise = await callGroq(cfg.gemini_key, system, prompt, 1200);

    await supabase
      .from('diario_entradas')
      .update({ analise_ia: analise, analise_gerada_em: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('data', dataHoje);

    return NextResponse.json({ analise });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao chamar o Groq';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
