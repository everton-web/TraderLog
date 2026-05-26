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

async function callGemini(apiKey: string, system: string, prompt: string, maxTokens = 1024): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Gemini error ${res.status}`);
  }

  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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
      { error: 'Configure a API key do Google AI em Integrações primeiro.' },
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

  const entradaHoje    = formatEntrada(entrada);
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

  try {
    const analise = await callGemini(cfg.gemini_key, system, prompt, 1024);

    await supabase
      .from('diario_entradas')
      .update({ analise_ia: analise, analise_gerada_em: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('data', entrada.data);

    return NextResponse.json({ analise });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao chamar o Gemini';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
