import { formatDate } from '@/lib/formatters';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // cache 1 hora

interface Evento {
  date: string;
  country: string;
  event: string;
  currency: string;
  previous: string | null;
  estimate: string | null;
  actual: string | null;
  impact: string;
  changePercentage: number | null;
}

const IMPACT_COLOR: Record<string, string> = {
  High:   'var(--loss)',
  Medium: 'var(--pe-color)',
  Low:    'var(--text-muted)',
};

const IMPACT_LABEL: Record<string, string> = {
  High:   'ALTO',
  Medium: 'MÉDIO',
  Low:    'BAIXO',
};

async function fetchEventos(): Promise<Evento[] | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  const hoje  = new Date();
  const from  = hoje.toISOString().slice(0, 10);
  const toDate = new Date(hoje);
  toDate.setDate(toDate.getDate() + 7);
  const to = toDate.toISOString().slice(0, 10);

  try {
    const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data: Evento[] = await res.json();

    // Filtra USD e BRL, impacto médio ou alto
    return data
      .filter(e =>
        (e.currency === 'USD' || e.currency === 'BRL') &&
        (e.impact === 'High' || e.impact === 'Medium'),
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return null;
  }
}

function formatValor(v: string | null): string {
  if (v == null || v === '') return '—';
  return v;
}

function formatDataHora(iso: string): { data: string; hora: string } {
  const d = new Date(iso);
  const data = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { data, hora };
}

export default async function CalendarioPage() {
  const eventos = await fetchEventos();

  return (
    <div>
      <div className="section-header">
        <h1>Calendário Econômico</h1>
        <p className="section-desc">Eventos USD e BRL — próximos 7 dias · impacto médio e alto</p>
      </div>

      {eventos === null && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
            Configure a variável de ambiente <code style={{ background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: 4 }}>FMP_API_KEY</code> no Vercel para exibir os eventos.
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Chave gratuita em financialmodelingprep.com → até 250 req/dia
          </div>
        </div>
      )}

      {eventos !== null && eventos.length === 0 && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 14,
        }}>
          Nenhum evento de impacto médio/alto nos próximos 7 dias.
        </div>
      )}

      {eventos !== null && eventos.length > 0 && (
        <div className="table-card">
          <div className="table-wrapper">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Hora (BRT)</th>
                  <th>País</th>
                  <th>Evento</th>
                  <th>Impacto</th>
                  <th>Anterior</th>
                  <th>Estimativa</th>
                  <th>Real</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((ev, i) => {
                  const { data, hora } = formatDataHora(ev.date);
                  const cor = IMPACT_COLOR[ev.impact] ?? 'var(--text-muted)';
                  const hasActual = ev.actual != null && ev.actual !== '';
                  return (
                    <tr key={i} style={hasActual ? { opacity: 0.65 } : {}}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{data}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>{hora}</td>
                      <td>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                          background: 'var(--bg-surface)', border: '1px solid var(--border)',
                          borderRadius: 3, padding: '1px 5px', color: 'var(--text-secondary)',
                        }}>
                          {ev.currency}
                        </span>
                      </td>
                      <td style={{ maxWidth: 320, fontWeight: 500 }}>{ev.event}</td>
                      <td>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: cor,
                          background: `color-mix(in srgb, ${cor} 10%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${cor} 30%, transparent)`,
                          borderRadius: 3, padding: '1px 6px',
                        }}>
                          {IMPACT_LABEL[ev.impact] ?? ev.impact}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                        {formatValor(ev.previous)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {formatValor(ev.estimate)}
                      </td>
                      <td style={{
                        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                        color: hasActual ? 'var(--gain)' : 'var(--text-muted)',
                      }}>
                        {formatValor(ev.actual)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
