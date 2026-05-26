import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type OhlcResult = { data: string; abertura: number; maximo: number; minimo: number; fechamento: number };
type CalEvent   = { country: string; event: string; impact: string; estimate: string | null; unit: string | null };

async function fetchOHLC(ativo: string): Promise<OhlcResult | null> {
  const symbol = ativo === 'WIN' ? '^BVSP' : 'BRL=X';
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=10d`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }
  );
  if (!res.ok) return null;
  const json = await res.json() as {
    chart: { result?: [{ timestamp: number[]; indicators: { quote: [{ open: (number|null)[]; high: (number|null)[]; low: (number|null)[]; close: (number|null)[] }] } }] };
  };
  const result = json.chart.result?.[0];
  if (!result) return null;
  const t = result.timestamp;
  const q = result.indicators.quote[0];
  let idx = t.length - 1;
  while (idx >= 0 && q.close[idx] == null) idx--;
  if (idx < 0) return null;
  const mult = ativo === 'WDO' ? 1000 : 1;
  const c = q.close[idx]!;
  return {
    data:       new Date(t[idx] * 1000).toISOString().split('T')[0],
    abertura:   Math.round((q.open[idx]  ?? c) * mult),
    maximo:     Math.round((q.high[idx]  ?? c) * mult),
    minimo:     Math.round((q.low[idx]   ?? c) * mult),
    fechamento: Math.round(c * mult),
  };
}

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

  if (!cfg?.gemini_key) {
    return NextResponse.json({ error: 'Configure a API key do Groq em Integrações.' }, { status: 400 });
  }

  const { ativo = 'WIN' } = await req.json() as { ativo?: string };

  let finnhubKey: string | null = null;
  try {
    const { data: fhCfg } = await supabase
      .from('bridge_config')
      .select('finnhub_key')
      .eq('user_id', user.id)
      .maybeSingle();
    finnhubKey = (fhCfg as Record<string, string | null> | null)?.finnhub_key ?? null;
  } catch {}

  const [ohlc, eventos] = await Promise.all([
    fetchOHLC(ativo).catch(() => null),
    finnhubKey ? fetchCalendario(finnhubKey).catch(() => []) : Promise.resolve([] as CalEvent[]),
  ]);

  if (!ohlc) {
    return NextResponse.json({ error: 'Não foi possível obter OHLC. Tente novamente.' }, { status: 502 });
  }

  const range    = ohlc.maximo - ohlc.minimo;
  const direcao  = ohlc.fechamento > ohlc.abertura ? 'alta' : ohlc.fechamento < ohlc.abertura ? 'baixa' : 'lateral';
  const calTexto = eventos.length > 0
    ? eventos.map(e => `  [${e.impact.toUpperCase()}] ${e.country} — ${e.event}${e.estimate != null ? ` | est: ${e.estimate}${e.unit ?? ''}` : ''}`).join('\n')
    : '  Nenhum evento de alto impacto para hoje';

  const prompt = `Sou trader de day trading de ${ativo} na B3. Gere um resumo do pregão de HOJE.

OHLC de ontem (${ativo}) — ${ohlc.data}:
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
    return NextResponse.json({ resumo, ohlc, eventos });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao chamar o Groq';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
