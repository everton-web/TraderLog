import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface FinnhubEvent {
  actual:   string | null;
  country:  string;
  estimate: string | null;
  event:    string;
  impact:   string;
  prev:     string | null;
  time:     string;
  unit:     string | null;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // finnhub_key pode não existir ainda (migration pendente)
  let finnhubKey: string | null = null;
  try {
    const { data } = await supabase
      .from('bridge_config')
      .select('finnhub_key')
      .eq('user_id', user.id)
      .maybeSingle();
    finnhubKey = (data as Record<string, string | null> | null)?.finnhub_key ?? null;
  } catch {}

  if (!finnhubKey) {
    return NextResponse.json({ events: [], missingKey: true });
  }

  const { searchParams } = new URL(req.url);
  const from       = searchParams.get('from') ?? new Date().toISOString().split('T')[0];
  const to         = searchParams.get('to')   ?? from;
  const paises     = (searchParams.get('paises')     ?? 'US,BR').split(',');
  const relevancia = (searchParams.get('relevancia') ?? 'high,medium').split(',');

  try {
    const url = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${finnhubKey}`;
    const res = await fetch(url);

    if (!res.ok) return NextResponse.json({ events: [] });

    const data = await res.json() as { economicCalendar?: FinnhubEvent[] };
    const events = (data.economicCalendar ?? []).filter(e =>
      paises.includes(e.country) && relevancia.includes(e.impact)
    );

    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
