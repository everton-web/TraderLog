import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const MERCADO_LABELS: Record<string, string> = {
  lateral:         'Lateral',
  tendencia_alta:  'Tendência de Alta',
  tendencia_baixa: 'Tendência de Baixa',
  volatil:         'Volátil',
};

const PLANO_LABELS: Record<string, string> = {
  sim:          'Sim',
  parcialmente: 'Parcialmente',
  nao:          'Não',
};

type EntradaRow = Record<string, unknown>;

function formatEntrada(e: EntradaRow): string {
  const pts = e.resultado_pts != null
    ? `${Number(e.resultado_pts) > 0 ? '+' : ''}${e.resultado_pts} pts`
    : '-';
  return [
    `DATA: ${e.data}`,
    `Mercado: ${e.mercado ? (MERCADO_LABELS[e.mercado as string] ?? e.mercado) : '-'} | ATR: ${e.atr_pts ?? '-'} pts | ADX: ${e.adx_valor ?? '-'}`,
    `Operações: ${e.operacoes ?? '-'}`,
    `Plano seguido: ${e.plano_seguido ? (PLANO_LABELS[e.plano_seguido as string] ?? e.plano_seguido) : '-'} | Emocional: ${e.emocional ?? '-'}/5`,
    `Resultado: ${pts}`,
    `Observações: ${e.observacoes ?? '-'}`,
  ].join('\n');
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: cfg } = await supabase
    .from('bridge_config')
    .select('anthropic_key')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!cfg?.anthropic_key) {
    return NextResponse.json(
      { error: 'Configure a API key da Anthropic em Integrações primeiro.' },
      { status: 400 }
    );
  }

  const { entrada } = await req.json() as { entrada: EntradaRow };

  const { data: historico } = await supabase
    .from('diario_entradas')
    .select('*')
    .eq('user_id', user.id)
    .neq('data', entrada.data)
    .order('data', { ascending: false })
    .limit(10);

  const entradaHoje   = formatEntrada(entrada);
  const historicoTexto = historico?.length
    ? historico.map(formatEntrada).join('\n\n---\n\n')
    : 'Nenhuma entrada anterior registrada.';

  const system = `Você é um coach de trading especializado em day trading de mini índice (WIN) e mini dólar (WDO) na B3.
Analise o diário do trader e forneça insights práticos e diretos para melhorar a performance.
Responda em português brasileiro. Use formatação clara com seções e bullet points.`;

  const prompt = `Analise o diário de trading e gere um briefing para o próximo pregão.

## ENTRADA DE HOJE
${entradaHoje}

## HISTÓRICO RECENTE
${historicoTexto}

## SOLICITAÇÃO
Com base nos dados acima, forneça:
1. **Análise do dia** — o que funcionou, o que não funcionou
2. **Padrões identificados** — comportamentos recorrentes no histórico (se houver)
3. **Pontos de atenção** — riscos emocionais ou operacionais para amanhã
4. **Recomendações** — máx. 3 ações concretas para o próximo pregão

Seja direto e específico. Máximo 400 palavras.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':          cfg.anthropic_key,
      'anthropic-version':  '2023-06-01',
      'content-type':       'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
    return NextResponse.json(
      { error: err.error?.message ?? 'Erro ao chamar a API da Anthropic' },
      { status: response.status }
    );
  }

  const result = await response.json() as { content?: { text?: string }[] };
  const analise = result.content?.[0]?.text ?? '';

  await supabase
    .from('diario_entradas')
    .update({ analise_ia: analise, analise_gerada_em: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('data', entrada.data);

  return NextResponse.json({ analise });
}
