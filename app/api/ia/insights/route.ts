import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface OpRow {
  dia_semana:  string;
  ativo:       string;
  situacao:    string | null;
  setup:       string | null;
  rs_final:    number | null;
  pts_final:   number | null;
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
      { error: 'Configure a API key em Integrações.' },
      { status: 400 }
    );
  }

  const { ops }: { ops: OpRow[] } = await req.json();

  if (!ops?.length) {
    return NextResponse.json({ error: 'Sem operações para analisar.' }, { status: 400 });
  }

  const gains  = ops.filter(o => o.situacao === 'Gain').length;
  const losses = ops.filter(o => o.situacao === 'Loss').length;
  const pes    = ops.filter(o => o.situacao === 'PE').length;
  const acerto = (gains + losses) > 0 ? ((gains / (gains + losses)) * 100).toFixed(1) : null;

  const byDay: Record<string, { rs: number; count: number }> = {};
  ops.forEach(o => {
    if (!o.dia_semana) return;
    if (!byDay[o.dia_semana]) byDay[o.dia_semana] = { rs: 0, count: 0 };
    byDay[o.dia_semana].rs    += o.rs_final    ?? 0;
    byDay[o.dia_semana].count += 1;
  });

  const bySetup: Record<string, { wins: number; total: number; rs: number }> = {};
  ops.forEach(o => {
    const s = o.setup?.trim();
    if (!s) return;
    if (!bySetup[s]) bySetup[s] = { wins: 0, total: 0, rs: 0 };
    bySetup[s].total++;
    bySetup[s].rs += o.rs_final ?? 0;
    if (o.situacao === 'Gain') bySetup[s].wins++;
  });

  const recentStr = ops.slice(-5).map(o => o.situacao ?? '?').join(', ');

  const prompt = `Sou trader de day trading (WIN/WDO na B3). Analise meu histórico e dê um insight rápido.

RESUMO (${ops.length} operações):
- Acerto: ${acerto ?? '—'}%
- Ganhos: ${gains} | Perdas: ${losses} | PE: ${pes}
- Últimos 5 resultados: ${recentStr}

POR DIA DA SEMANA:
${Object.entries(byDay).map(([d, v]) => `  ${d}: ${v.count} ops, resultado acumulado R$${v.rs.toFixed(0)}`).join('\n') || '  —'}

POR SETUP:
${Object.entries(bySetup).slice(0, 5).map(([s, v]) => `  ${s}: ${v.wins}/${v.total} wins, R$${v.rs.toFixed(0)}`).join('\n') || '  —'}

Responda EM PORTUGUÊS com exatamente 3 linhas curtas, uma por bullet:
• [ponto positivo identificado nos dados]
• [ponto de atenção ou padrão negativo]
• [1 dica objetiva para hoje]

Seja direto e específico. Sem introdução, sem conclusão.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         cfg.anthropic_key,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
    return NextResponse.json(
      { error: err.error?.message ?? 'Erro ao chamar a API' },
      { status: response.status }
    );
  }

  const result = await response.json() as { content?: { text?: string }[] };
  return NextResponse.json({ insight: result.content?.[0]?.text ?? '' });
}
