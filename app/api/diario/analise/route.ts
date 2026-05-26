import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const PLANO_LABELS: Record<string, string> = {
  sim: 'Sim', parcialmente: 'Parcialmente', nao: 'Não',
};

type EntradaRow = Record<string, unknown>;

interface OhlcResult {
  data:       string;
  abertura:   number;
  maximo:     number;
  minimo:     number;
  fechamento: number;
}

async function fetchOHLC(ativo: 'WIN' | 'WDO'): Promise<OhlcResult | null> {
  const symbol = ativo === 'WIN' ? '^BVSP' : 'BRL=X';
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
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
  } catch { return null; }
}

function fmtOHLC(ativo: string, d: OhlcResult | null): string {
  if (!d) return `${ativo}FUT: dados indisponíveis`;
  const range = d.maximo - d.minimo;
  const dir   = d.fechamento > d.abertura ? 'alta' : d.fechamento < d.abertura ? 'baixa' : 'lateral';
  return `${ativo}FUT (${d.data}): Abertura ${d.abertura.toLocaleString('pt-BR')} | Máxima ${d.maximo.toLocaleString('pt-BR')} | Mínima ${d.minimo.toLocaleString('pt-BR')} | Fechamento ${d.fechamento.toLocaleString('pt-BR')} | Range ${range} pts | ${dir}`;
}

function fmtEntradaHistorico(e: EntradaRow): string {
  return [
    `DATA: ${e.data}`,
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
    .select('gemini_key, finnhub_key')
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

  const trinta = new Date();
  trinta.setDate(trinta.getDate() - 30);

  type CalEvento = { country: string; event: string; impact: string; estimate: string | null; unit: string | null };

  async function fetchCal(): Promise<CalEvento[]> {
    try {
      const fk = cfg?.finnhub_key as string | null;
      if (!fk) return [];
      const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
      const url = `https://finnhub.io/api/v1/calendar/economic?from=${dataHoje}&to=${amanha.toISOString().split('T')[0]}&token=${fk}`;
      const r = await fetch(url);
      if (!r.ok) return [];
      const d = await r.json() as { economicCalendar?: CalEvento[] };
      return (d.economicCalendar ?? []).filter(e =>
        ['US', 'BR', 'EU', 'GB'].includes(e.country) && ['high', 'medium'].includes(e.impact)
      );
    } catch { return []; }
  }

  const [winRes, wdoRes, calRes, opsHojeRes, historicoRes, opsRecentesRes] = await Promise.allSettled([
    fetchOHLC('WIN'),
    fetchOHLC('WDO'),
    fetchCal(),
    supabase
      .from('operacoes')
      .select('ativo, tipo, setup, pe, stop, saida, pts_final, rs_final, situacao, obs')
      .eq('user_id', user.id)
      .eq('data', dataHoje)
      .order('created_at'),
    supabase
      .from('diario_entradas')
      .select('*')
      .eq('user_id', user.id)
      .neq('data', dataHoje)
      .order('data', { ascending: false })
      .limit(10),
    supabase
      .from('operacoes')
      .select('data, situacao, rs_final, pts_final')
      .eq('user_id', user.id)
      .gte('data', trinta.toISOString().split('T')[0])
      .order('data', { ascending: false }),
  ]);

  const win        = winRes.status        === 'fulfilled' ? winRes.value        : null;
  const wdo        = wdoRes.status        === 'fulfilled' ? wdoRes.value        : null;
  const eventos    = calRes.status        === 'fulfilled' ? calRes.value        : [];
  const opsHoje    = opsHojeRes.status    === 'fulfilled' ? (opsHojeRes.value.data    ?? []) : [];
  const historico  = historicoRes.status  === 'fulfilled' ? (historicoRes.value.data  ?? []) : [];
  const opsRecentes= opsRecentesRes.status=== 'fulfilled' ? (opsRecentesRes.value.data?? []) : [];

  const gains     = opsRecentes.filter(o => o.situacao === 'Gain').length;
  const losses    = opsRecentes.filter(o => o.situacao === 'Loss').length;
  const rsTotal   = opsRecentes.reduce((s, o) => s + (o.rs_final ?? 0), 0);
  const acerto    = (gains + losses) > 0 ? ((gains / (gains + losses)) * 100).toFixed(1) : null;

  let streak = 0;
  let streakTipo = '';
  if (opsRecentes.length) {
    const ultima = opsRecentes[0].situacao;
    if (ultima === 'Gain' || ultima === 'Loss') {
      streakTipo = ultima;
      for (const op of opsRecentes) {
        if (op.situacao === ultima) streak++;
        else break;
      }
    }
  }

  const ontem = historico[0];

  const opsTexto = opsHoje.length
    ? opsHoje.map(o =>
        `  ${o.ativo} ${o.tipo}${o.setup ? ` [${o.setup}]` : ''} | PE ${o.pe} → Saída ${o.saida} | ${o.pts_final != null ? `${o.pts_final > 0 ? '+' : ''}${o.pts_final} pts` : '—'} | ${o.situacao ?? '—'}${o.obs ? ` | ${o.obs}` : ''}`
      ).join('\n')
    : '  Nenhuma operação registrada';

  const calTexto = eventos.length > 0
    ? eventos.map(e => `  [${e.impact.toUpperCase()}] ${e.country} — ${e.event}${e.estimate != null ? ` | est: ${e.estimate}${e.unit ?? ''}` : ''}`).join('\n')
    : '  Nenhum evento relevante próximo';

  const system = `Você é um coach de trading especializado em day trading de mini índice (WIN) e mini dólar (WDO) na B3.
Analise o diário do trader com profundidade e forneça insights práticos, diretos e personalizados.
Responda sempre em português brasileiro. Use markdown simples (##, **, bullet points).
Seja específico: cite números, padrões e situações reais dos dados fornecidos.`;

  const prompt = `Analise o diário de trading e gere um briefing completo para o próximo pregão.

## HOJE — ${dataHoje}
${fmtOHLC('WIN', win)}
${fmtOHLC('WDO', wdo)}

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
- Taxa de acerto: ${acerto ?? '—'}% (${gains} gains / ${losses} losses)
- Resultado acumulado: R$ ${rsTotal.toFixed(2)}
- Sequência atual: ${streak > 1 ? `${streak} ${streakTipo === 'Gain' ? 'gains' : 'losses'} consecutivos` : 'sem sequência relevante'}

---

## HISTÓRICO RECENTE (diário)
${historico.slice(0, 5).map(e => fmtEntradaHistorico(e as EntradaRow)).join('\n\n---\n\n') || 'Sem histórico.'}

---

## CALENDÁRIO ECONÔMICO (hoje/amanhã)
${calTexto}

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
