import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAmbiente } from '@/lib/ambiente';

interface OhlcResult {
  data:       string;
  abertura:   number;
  maximo:     number;
  minimo:     number;
  fechamento: number;
}

interface FinnhubEvent {
  country:  string;
  event:    string;
  impact:   string;
  estimate: string | null;
  unit:     string | null;
  time:     string;
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

async function fetchCalendario(finnhubKey: string): Promise<FinnhubEvent[]> {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const res  = await fetch(`https://finnhub.io/api/v1/calendar/economic?from=${hoje}&to=${hoje}&token=${finnhubKey}`);
    if (!res.ok) return [];
    const data = await res.json() as { economicCalendar?: FinnhubEvent[] };
    return (data.economicCalendar ?? []).filter(e =>
      ['US', 'BR', 'EU', 'GB'].includes(e.country) && ['high', 'medium'].includes(e.impact)
    );
  } catch { return []; }
}

function fmtOHLC(ativo: string, d: OhlcResult | null): string {
  if (!d) return `${ativo}FUT: dados indisponíveis`;
  const range = d.maximo - d.minimo;
  const dir   = d.fechamento > d.abertura ? 'alta' : d.fechamento < d.abertura ? 'baixa' : 'lateral';
  return `${ativo}FUT (${d.data}): Abertura ${d.abertura.toLocaleString('pt-BR')} | Máxima ${d.maximo.toLocaleString('pt-BR')} | Mínima ${d.minimo.toLocaleString('pt-BR')} | Fechamento ${d.fechamento.toLocaleString('pt-BR')} | Range ${range} pts | ${dir}`;
}

async function callGroq(apiKey: string, system: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      max_tokens:  600,
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

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: cfg } = await supabase
    .from('bridge_config')
    .select('gemini_key, finnhub_key')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!cfg?.gemini_key)
    return NextResponse.json({ error: 'Configure a API key do Groq em Integrações primeiro.' }, { status: 400 });

  // Busca tudo em paralelo — OHLC de ambos ativos, calendário e histórico do trader
  const trinta  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const ambiente = await getAmbiente();
  const [winRes, wdoRes, calRes, historicoRes, recentesRes] = await Promise.allSettled([
    fetchOHLC('WIN'),
    fetchOHLC('WDO'),
    cfg.finnhub_key ? fetchCalendario(cfg.finnhub_key as string) : Promise.resolve([] as FinnhubEvent[]),
    supabase
      .from('diario_entradas')
      .select('data, resultado_pts, emocional, plano_seguido')
      .eq('user_id', user.id)
      .order('data', { ascending: false })
      .limit(7),
    supabase
      .from('operacoes')
      .select('situacao, rs_final, setup, dia_semana, ativo')
      .eq('user_id', user.id)
      .eq('ambiente', ambiente)
      .gte('data', trinta),
  ]);

  const win       = winRes.status       === 'fulfilled' ? winRes.value       : null;
  const wdo       = wdoRes.status       === 'fulfilled' ? wdoRes.value       : null;
  const eventos   = calRes.status       === 'fulfilled' ? calRes.value       : [];
  const historico = historicoRes.status === 'fulfilled' ? (historicoRes.value.data ?? []) : [];
  const recentes  = recentesRes.status  === 'fulfilled' ? (recentesRes.value.data ?? []) : [];

  // Estatísticas dos últimos 30 dias
  const gains   = recentes.filter(o => o.situacao === 'Gain').length;
  const losses  = recentes.filter(o => o.situacao === 'Loss').length;
  const rsTotal = recentes.reduce((s, o) => s + (o.rs_final ?? 0), 0);
  const acerto  = (gains + losses) > 0 ? ((gains / (gains + losses)) * 100).toFixed(1) : null;

  // Por dia da semana
  const byDay: Record<string, { rs: number; count: number; wins: number }> = {};
  recentes.forEach(o => {
    const d = o.dia_semana;
    if (!d) return;
    if (!byDay[d]) byDay[d] = { rs: 0, count: 0, wins: 0 };
    byDay[d].rs    += o.rs_final ?? 0;
    byDay[d].count += 1;
    if (o.situacao === 'Gain') byDay[d].wins++;
  });

  const diaSemana  = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  const dataHoje   = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const calTexto = eventos.length > 0
    ? eventos
        .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
        .map(e => {
          const hora = e.time ? new Date(e.time.replace(' ', 'T') + 'Z')
            .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '—';
          return `  [${e.impact.toUpperCase()}] ${hora} — ${e.country}: ${e.event}${e.estimate ? ` (est: ${e.estimate}${e.unit ?? ''})` : ''}`;
        }).join('\n')
    : cfg.finnhub_key
      ? '  Agenda limpa hoje'
      : '  (Configure Finnhub em Integrações para ver o calendário)';

  const historicoTexto = historico.length > 0
    ? historico.map(e =>
        `  ${e.data}: resultado ${e.resultado_pts != null ? `${Number(e.resultado_pts) > 0 ? '+' : ''}${e.resultado_pts} pts` : '—'} | emocional ${e.emocional ?? '—'}/5 | plano ${e.plano_seguido ?? '—'}`
      ).join('\n')
    : '  Sem entradas no diário ainda';

  const byDayTexto = Object.entries(byDay).length > 0
    ? Object.entries(byDay)
        .map(([d, v]) => `  ${d}: ${v.wins}/${v.count} wins, R$${v.rs.toFixed(0)}`)
        .join('\n')
    : '  —';

  const system = `Você é um coach de day trading especializado em WIN (mini índice Ibovespa) e WDO (mini dólar) na B3.
Gere briefings matinais objetivos, específicos e personalizados para o trader começar o pregão.
Responda em português brasileiro. Use markdown simples (##, bullets). Cite sempre números reais dos dados.`;

  const prompt = `# BRIEFING MATINAL — ${dataHoje} (${diaSemana})

## MERCADO — PREGÃO DE ONTEM
${fmtOHLC('WIN', win)}
${fmtOHLC('WDO', wdo)}

## CALENDÁRIO ECONÔMICO DE HOJE
${calTexto}

## MEU DESEMPENHO — últimos 30 dias
Acerto: ${acerto ?? '—'}% | ${gains} gains / ${losses} losses | Resultado acumulado: R$${rsTotal.toFixed(0)}

Por dia da semana:
${byDayTexto}

## DIÁRIO RECENTE
${historicoTexto}

---

Gere o briefing com exatamente 3 seções:

## Contexto do mercado
O que WIN e WDO fizeram ontem? Range, direção, fechamento. Relação entre os dois (dólar subiu, índice caiu?). Máximo 3 linhas.

## O que observar hoje
Níveis técnicos chave de WIN e WDO baseados no AMMF de ontem (suporte, resistência, pontos de atenção). Eventos do calendário que podem mover os ativos — cite horários em BRT. Cenário mais provável. Cite os preços e horários reais.

## Foco do dia
1-2 alertas personalizados para hoje: padrão do dia da semana no meu histórico + postura recomendada.

Máximo 280 palavras. Zero generalidade — apenas dados reais.`;

  try {
    const briefing = await callGroq(cfg.gemini_key, system, prompt);
    return NextResponse.json({ briefing });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao chamar o Groq';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
