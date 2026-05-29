import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface OhlcInput {
  abertura:   number;
  maximo:     number;
  minimo:     number;
  fechamento: number;
}

type CalEvent = { country: string; event: string; impact: string; estimate: string | null; unit: string | null };

async function fetchCalendario(finnhubKey: string): Promise<CalEvent[]> {
  const hoje = new Date().toISOString().split('T')[0];
  const res  = await fetch(`https://finnhub.io/api/v1/calendar/economic?from=${hoje}&to=${hoje}&token=${finnhubKey}`);
  if (!res.ok) return [];
  const data = await res.json() as { economicCalendar?: CalEvent[] };
  return (data.economicCalendar ?? []).filter(e =>
    ['US', 'BR'].includes(e.country) && ['high', 'medium'].includes(e.impact)
  );
}

async function callGroq(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
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
    return NextResponse.json({ error: 'Configure a API key do Groq em Integrações.' }, { status: 400 });

  const { ativo = 'WIN', ohlc } = await req.json() as { ativo?: string; ohlc?: OhlcInput };

  if (!ohlc || !ohlc.abertura || !ohlc.maximo || !ohlc.minimo || !ohlc.fechamento)
    return NextResponse.json({ error: 'Preencha todos os campos do AMMF.' }, { status: 400 });

  let finnhubKey: string | null = null;
  try {
    const { data: fhCfg } = await supabase
      .from('bridge_config')
      .select('finnhub_key')
      .eq('user_id', user.id)
      .maybeSingle();
    finnhubKey = (fhCfg as Record<string, string | null> | null)?.finnhub_key ?? null;
  } catch {}

  const eventos = finnhubKey
    ? await fetchCalendario(finnhubKey).catch(() => [] as CalEvent[])
    : [] as CalEvent[];

  const range    = ohlc.maximo - ohlc.minimo;
  const direcao  = ohlc.fechamento > ohlc.abertura ? 'alta' : ohlc.fechamento < ohlc.abertura ? 'baixa' : 'lateral';
  const calTexto = eventos.length > 0
    ? eventos.map(e => `  [${e.impact.toUpperCase()}] ${e.country} — ${e.event}${e.estimate != null ? ` | est: ${e.estimate}${e.unit ?? ''}` : ''}`).join('\n')
    : '  Nenhum evento de alto impacto para hoje';

  const prompt = `Sou trader de day trading de ${ativo} na B3. Gere um resumo do pregão de HOJE.

AMMF de ontem (${ativo}):
Abertura: ${ohlc.abertura.toLocaleString('pt-BR')} | Máxima: ${ohlc.maximo.toLocaleString('pt-BR')} | Mínima: ${ohlc.minimo.toLocaleString('pt-BR')} | Fechamento: ${ohlc.fechamento.toLocaleString('pt-BR')}
Range: ${range} pts | Direção: ${direcao}

CALENDÁRIO ECONÔMICO DE HOJE:
${calTexto}

Responda EM PORTUGUÊS com exatamente 3 seções:

## Contexto de ontem
[2 frases sobre o que o mercado fez — cite os níveis]

## O que observar hoje
[3 pontos: suporte chave, resistência chave, cenário mais provável — use os preços reais]

## Agenda do dia
[eventos relevantes e impacto esperado no ${ativo} — ou "Agenda limpa, foco na técnica"]

Máximo 150 palavras. Cite os números. Sem introdução ou conclusão.`;

  try {
    const resumo = await callGroq(cfg.gemini_key, prompt);
    return NextResponse.json({ resumo });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao chamar o Groq';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
