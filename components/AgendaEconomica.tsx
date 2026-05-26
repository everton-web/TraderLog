'use client';
import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, AlertCircle, RefreshCw } from 'lucide-react';

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

type Period = 'today' | 'week' | 'nextWeek';

const COUNTRY_OPTS = [
  { code: 'BR', label: 'Brasil' },
  { code: 'US', label: 'EUA' },
  { code: 'EU', label: 'Europa' },
  { code: 'GB', label: 'UK' },
  { code: 'DE', label: 'Alemanha' },
  { code: 'JP', label: 'Japão' },
  { code: 'CN', label: 'China' },
  { code: 'CA', label: 'Canadá' },
];

const IMPACT_OPTS = [
  { value: 'high',          label: 'Alto' },
  { value: 'high,medium',   label: 'Médio+' },
  { value: 'high,medium,low', label: 'Todos' },
];

const PERIOD_OPTS: { value: Period; label: string }[] = [
  { value: 'today',    label: 'Hoje' },
  { value: 'week',     label: 'Esta semana' },
  { value: 'nextWeek', label: 'Próx. semana' },
];

function getDateRange(period: Period) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (period === 'today') { const s = fmt(now); return { from: s, to: s }; }
  const day    = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + (period === 'nextWeek' ? 7 : 0));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return { from: fmt(monday), to: fmt(friday) };
}

function fmtDateTime(time: string | null, period: Period): string {
  if (!time) return '—';
  try {
    const d = new Date(time.replace(' ', 'T') + 'Z');
    if (period === 'today')
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  } catch { return '—'; }
}

function ImpactDots({ impact }: { impact: string }) {
  const color = impact === 'high' ? 'var(--loss)' : impact === 'medium' ? 'var(--pe-color)' : 'var(--text-muted)';
  const filled = impact === 'high' ? 3 : impact === 'medium' ? 2 : 1;
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i <= filled ? color : 'var(--border)', flexShrink: 0 }} />
      ))}
    </span>
  );
}

const TH: React.CSSProperties = { padding: '7px 10px', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: '9px 10px', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', verticalAlign: 'middle' };

export default function AgendaEconomica() {
  const [period,     setPeriod]     = useState<Period>('today');
  const [selected,   setSelected]   = useState(new Set(['BR', 'US', 'EU', 'GB']));
  const [impact,     setImpact]     = useState('high,medium');
  const [events,     setEvents]     = useState<CalEvent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [missingKey, setMissingKey] = useState(false);

  const label = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = getDateRange(period);
    const countries = [...selected].join(',');
    const url = `/api/mercado/calendario?from=${from}&to=${to}&paises=${countries}&relevancia=${impact}`;
    try {
      const res  = await fetch(url);
      const data = await res.json() as { events?: CalEvent[]; missingKey?: boolean };
      if (data.missingKey) { setMissingKey(true); setEvents([]); }
      else { setMissingKey(false); setEvents(data.events ?? []); }
    } catch { setEvents([]); }
    finally  { setLoading(false); }
  }, [period, selected, impact]);

  useEffect(() => { load(); }, [load]);

  function toggleCountry(code: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code) && next.size > 1) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <div className="dash-chart-card" style={{ marginBottom: 16 }}>

      {/* Header */}
      <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="dash-chart-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <CalendarDays size={14} style={{ color: 'var(--pe-color)' }} /> Agenda Econômica
            </div>
            <div className="dash-chart-sub" style={{ marginTop: 3 }}>
              {label.charAt(0).toUpperCase() + label.slice(1)} · via Finnhub
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="toggle-group">
              {PERIOD_OPTS.map(o => (
                <button key={o.value} type="button" className={`toggle-btn${period === o.value ? ' active' : ''}`} onClick={() => setPeriod(o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-secondary" style={{ padding: '5px 8px' }} onClick={load} disabled={loading} title="Atualizar">
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Country + Impact */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Países</span>
          <div className="toggle-group" style={{ flexWrap: 'wrap' }}>
            {COUNTRY_OPTS.map(c => (
              <button key={c.code} type="button" className={`toggle-btn${selected.has(c.code) ? ' active' : ''}`} onClick={() => toggleCountry(c.code)}>
                {c.label}
              </button>
            ))}
          </div>

          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Impacto</span>
          <div className="toggle-group">
            {IMPACT_OPTS.map(o => (
              <button key={o.value} type="button" className={`toggle-btn${impact === o.value ? ' active' : ''}`} onClick={() => setImpact(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      {missingKey ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '12px 0' }}>
          <AlertCircle size={14} style={{ color: 'var(--pe-color)', flexShrink: 0 }} />
          Configure a <strong style={{ color: 'var(--text-primary)' }}>API key do Finnhub</strong> em{' '}
          <a href="/integracoes" style={{ color: 'var(--gain)' }}>Integrações</a> para ver o calendário econômico.
        </div>
      ) : loading ? (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '12px 0' }}>Carregando eventos...</div>
      ) : events.length === 0 ? (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '12px 0' }}>Nenhum evento para os filtros selecionados.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ ...TH, textAlign: 'center', width: 60 }}>País</th>
                <th style={{ ...TH, textAlign: 'center', width: 110 }}>Horário (BRT)</th>
                <th style={{ ...TH, textAlign: 'left' }}>Evento</th>
                <th style={{ ...TH, textAlign: 'center', width: 80 }}>Impacto</th>
                <th style={{ ...TH, textAlign: 'right', width: 90 }}>Estimativa</th>
                <th style={{ ...TH, textAlign: 'right', width: 90 }}>Anterior</th>
                <th style={{ ...TH, textAlign: 'right', width: 90 }}>Atual</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...TD, textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}>{e.country}</td>
                  <td style={{ ...TD, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{fmtDateTime(e.time, period)}</td>
                  <td style={{ ...TD, textAlign: 'left', color: 'var(--text-primary)' }}>{e.event}</td>
                  <td style={{ ...TD, textAlign: 'center' }}><ImpactDots impact={e.impact} /></td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {e.estimate != null ? `${e.estimate}${e.unit ?? ''}` : '—'}
                  </td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {e.prev != null ? `${e.prev}${e.unit ?? ''}` : '—'}
                  </td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: e.actual != null ? 700 : 400, color: e.actual != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {e.actual != null ? `${e.actual}${e.unit ?? ''}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
