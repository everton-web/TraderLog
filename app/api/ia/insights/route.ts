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

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 256, temperature: 0.7 },
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
    byDay[o.dia_semana].rs    += o.rs_final ?? 0;
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
${Object.entries(byDay).map(([d, v]) => `  ${d}: ${v.count} ops, R$${v.rs.toFixed(0)}`).join('\n') || '  —'}

POR SETUP:
${Object.entries(bySetup).slice(0, 5).map(([s, v]) => `  ${s}: ${v.wins}/${v.total} wins, R$${v.rs.toFixed(0)}`).join('\n') || '  —'}

Responda EM PORTUGUÊS com exatamente 3 bullet points curtos:
• [ponto positivo identificado nos dados]
• [ponto de atenção ou padrão negativo]
• [1 dica objetiva para hoje]

Sem introdução, sem conclusão. Apenas os 3 bullets.`;

  try {
    const insight = await callGemini(cfg.gemini_key, prompt);
    return NextResponse.json({ insight });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao chamar o Gemini';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
