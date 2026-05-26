import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ativo = searchParams.get('ativo') ?? 'WIN';

  // WIN → Ibovespa (^BVSP) — mesmo nível de preço que WIN
  // WDO → USD/BRL (BRL=X) × 1000 — ex: 5.1450 → 5145
  const symbol = ativo === 'WIN' ? '^BVSP' : 'BRL=X';

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=10d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Erro Yahoo Finance: ${res.status}` }, { status: 502 });
    }

    const json = await res.json() as {
      chart: {
        result?: [{
          timestamp: number[];
          indicators: { quote: [{ open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[] }] };
        }];
        error?: unknown;
      };
    };

    const result = json.chart.result?.[0];
    if (!result) return NextResponse.json({ error: 'Dados não disponíveis' }, { status: 404 });

    const timestamps = result.timestamp;
    const q = result.indicators.quote[0];

    // Último pregão com fechamento válido
    let idx = timestamps.length - 1;
    while (idx >= 0 && q.close[idx] == null) idx--;
    if (idx < 0) return NextResponse.json({ error: 'Sem dados de fechamento' }, { status: 404 });

    const mult = ativo === 'WDO' ? 1000 : 1;
    const round = (v: number | null, fallback: number) =>
      Math.round((v ?? fallback) * mult);

    const close = q.close[idx]!;
    const dataStr = new Date(timestamps[idx] * 1000).toISOString().split('T')[0];

    return NextResponse.json({
      data:       dataStr,
      ativo,
      abertura:   round(q.open[idx],  close),
      maximo:     round(q.high[idx],  close),
      minimo:     round(q.low[idx],   close),
      fechamento: round(close,         close),
      fonte: 'Yahoo Finance',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar OHLC';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
