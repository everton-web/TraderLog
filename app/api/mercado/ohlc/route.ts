import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { inflateRawSync } from 'zlib';

// ── ZIP extractor (no external deps) ─────────────────────────────────────────
function extractFirstFileFromZip(buf: Buffer): Buffer {
  const sig = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  const idx = buf.indexOf(sig);
  if (idx === -1) throw new Error('No ZIP local file header');
  const compression = buf.readUInt16LE(idx + 8);
  const compSize    = buf.readUInt32LE(idx + 18);
  const nameLen     = buf.readUInt16LE(idx + 26);
  const extraLen    = buf.readUInt16LE(idx + 28);
  const dataStart   = idx + 30 + nameLen + extraLen;
  const data        = buf.subarray(dataStart, dataStart + compSize);
  if (compression === 0) return data;
  if (compression === 8) return inflateRawSync(data);
  throw new Error(`ZIP compression ${compression} not supported`);
}

// ── Last N business days (looking back from today) ───────────────────────────
function lastBusinessDays(n: number): Date[] {
  const days: Date[] = [];
  const d = new Date();
  while (days.length < n) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
  }
  return days;
}

// ── COTAHIST record parser ────────────────────────────────────────────────────
// Layout (1-based positions, 245 chars per record):
//  1- 2  TIPREG  ("01")
//  3-10  DATPRE  (YYYYMMDD)
// 11-12  CODBDI
// 13-24  CODNEG  (ticker, 12 chars)
// 25-27  TPMERC  ("070" = futures)
// 28-39  NOMRES
// 40-49  ESPECI
// 50-52  PRAZOT
// 53-56  MODREF
// 57-69  PREABE  (open,  ÷100)
// 70-82  PREMAX  (high,  ÷100)
// 83-95  PREMIN  (low,   ÷100)
// 96-108 PREMED  (avg,   ÷100)
//109-121 PREULT  (close, ÷100)
//153-170 QUATOT  (volume, 18 chars)
function parseFuturesOhlc(text: string, prefix: string) {
  let bestRec: { ticker: string; date: string; open: number; high: number; low: number; close: number } | null = null;
  let bestVol = -1;

  for (const line of text.split('\n')) {
    if (line.length < 121) continue;
    if (line.substring(0, 2) !== '01') continue;
    if (line.substring(24, 27) !== '070') continue; // futures only

    const ticker = line.substring(12, 24).trim();
    if (!ticker.startsWith(prefix)) continue;

    const px = (s: string) => parseInt(s.trim() || '0', 10) / 100;
    const open  = px(line.substring(56, 69));
    const high  = px(line.substring(69, 82));
    const low   = px(line.substring(82, 95));
    const close = px(line.substring(108, 121));
    if (close === 0) continue;

    const vol = line.length >= 170 ? parseInt(line.substring(152, 170).trim() || '0', 10) : 0;
    if (vol > bestVol) {
      bestVol = vol;
      const raw  = line.substring(2, 10);
      const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      bestRec = { ticker, date, open, high, low, close };
    }
  }
  return bestRec;
}

// ── Download COTAHIST for a given date ───────────────────────────────────────
async function fetchCotahist(date: Date): Promise<string | null> {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);

  const urls = [
    `https://www.b3.com.br/pesquisapregao/download?filelist=COTAHIST_D${dd}${mm}${yy}.ZIP`,
    `https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D${dd}${mm}${yy}.ZIP`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 500) continue; // too small — probably an error page

      const content = extractFirstFileFromZip(buf);
      const text    = content.toString('latin1');
      if (!text.startsWith('00')) continue; // not COTAHIST format

      return text;
    } catch { continue; }
  }
  return null;
}

// ── Yahoo Finance fallback ────────────────────────────────────────────────────
async function yahooFallback(ativo: 'WIN' | 'WDO') {
  const symbol = ativo === 'WIN' ? '^BVSP' : 'BRL=X';
  const url    = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=10d`;
  const res    = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return null;

  const json   = await res.json() as { chart: { result?: [{ timestamp: number[]; indicators: { quote: [{ open: (number|null)[]; high: (number|null)[]; low: (number|null)[]; close: (number|null)[] }] } }] } };
  const result = json.chart.result?.[0];
  if (!result) return null;

  const t = result.timestamp;
  const q = result.indicators.quote[0];
  let idx = t.length - 1;
  while (idx >= 0 && q.close[idx] == null) idx--;
  if (idx < 0) return null;

  const mult = ativo === 'WDO' ? 1000 : 1;
  const c    = q.close[idx]!;
  return {
    data:       new Date(t[idx] * 1000).toISOString().split('T')[0],
    ativo,
    abertura:   Math.round((q.open[idx]  ?? c) * mult),
    maximo:     Math.round((q.high[idx]  ?? c) * mult),
    minimo:     Math.round((q.low[idx]   ?? c) * mult),
    fechamento: Math.round(c * mult),
    fonte:      'Yahoo Finance (proxy spot)',
    contrato:   null as string | null,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ativo = (new URL(req.url).searchParams.get('ativo') ?? 'WIN') as 'WIN' | 'WDO';

  // Try last 5 business days (handles holidays)
  for (const day of lastBusinessDays(5)) {
    const text = await fetchCotahist(day);
    if (!text) continue;

    const rec = parseFuturesOhlc(text, ativo);
    if (!rec) continue;

    return NextResponse.json({
      data:       rec.date,
      ativo,
      abertura:   Math.round(rec.open),
      maximo:     Math.round(rec.high),
      minimo:     Math.round(rec.low),
      fechamento: Math.round(rec.close),
      fonte:      `B3 COTAHIST (${rec.ticker})`,
      contrato:   rec.ticker,
    });
  }

  // Fallback: Yahoo Finance (spot proxy)
  const yf = await yahooFallback(ativo);
  if (yf) return NextResponse.json(yf);

  return NextResponse.json({ error: 'Dados indisponíveis' }, { status: 503 });
}
