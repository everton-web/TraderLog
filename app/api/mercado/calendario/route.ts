import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface TVEvent {
  id:         string;
  date:       string;
  country:    string;
  currency:   string;
  title:      string;
  actual:     string | null;
  forecast:   string | null;
  previous:   string | null;
  importance: number;
  unit:       string | null;
}

interface CalEvent {
  actual:   string | null;
  country:  string;
  estimate: string | null;
  event:    string;
  impact:   string;
  prev:     string | null;
  time:     string;
  unit:     string | null;
}

const IMP_MAP: Record<number, string> = { 1: 'low', 2: 'medium', 3: 'high' };

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from       = searchParams.get('from') ?? new Date().toISOString().split('T')[0];
  const to         = searchParams.get('to')   ?? from;
  const paises     = (searchParams.get('paises')     ?? 'US,BR,EU,GB').split(',');
  const relevancia = (searchParams.get('relevancia') ?? 'high,medium').split(',');

  try {
    const url = new URL('https://economic-calendar.tradingview.com/events');
    url.searchParams.set('from', `${from}T00:00:00.000Z`);
    url.searchParams.set('to',   `${to}T23:59:59.000Z`);

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer':    'https://www.tradingview.com/',
        'Origin':     'https://www.tradingview.com',
        'Accept':     'application/json, text/plain, */*',
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return NextResponse.json({ events: [], unavailable: true });

    const data = await res.json() as { result?: TVEvent[] };

    const events: CalEvent[] = (data.result ?? [])
      .filter(e => {
        const imp = IMP_MAP[e.importance] ?? 'low';
        return paises.includes(e.country) && relevancia.includes(imp);
      })
      .map(e => ({
        actual:   e.actual   ?? null,
        country:  e.country,
        estimate: e.forecast ?? null,
        event:    e.title,
        impact:   IMP_MAP[e.importance] ?? 'low',
        prev:     e.previous ?? null,
        time:     e.date,
        unit:     e.unit     ?? null,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ events: [], unavailable: true });
  }
}
