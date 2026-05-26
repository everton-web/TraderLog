'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CalendarDays, AlertCircle } from 'lucide-react';

interface CalEvent {
  country:  string;
  event:    string;
  impact:   string;
  time:     string;
  estimate: string | null;
  actual:   string | null;
  prev:     string | null;
  unit:     string | null;
}

const FLAGS: Record<string, string> = {
  US: '🇺🇸', BR: '🇧🇷', EU: '🇪🇺', GB: '🇬🇧', DE: '🇩🇪',
  JP: '🇯🇵', CA: '🇨🇦', AU: '🇦🇺', CN: '🇨🇳', FR: '🇫🇷', CH: '🇨🇭', IT: '🇮🇹',
};

const PAISES = [
  { id: 'US', label: 'EUA',    flag: '🇺🇸' },
  { id: 'BR', label: 'Brasil', flag: '🇧🇷' },
  { id: 'EU', label: 'Euro',   flag: '🇪🇺' },
  { id: 'GB', label: 'Reino Unido', flag: '🇬🇧' },
  { id: 'DE', label: 'Alemanha',   flag: '🇩🇪' },
  { id: 'JP', label: 'Japão',  flag: '🇯🇵' },
  { id: 'CA', label: 'Canadá', flag: '🇨🇦' },
  { id: 'CN', label: 'China',  flag: '🇨🇳' },
];

function fmtTime(timeStr: string): string {
  if (!timeStr) return '—';
  try {
    const d = new Date(timeStr.replace(' ', 'T') + 'Z');
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  } catch { return '—'; }
}

function fmtVal(val: string | null, unit: string | null): string {
  if (val == null) return '—';
  return unit ? `${val}${unit}` : val;
}

export default function AgendaEconomica() {
  const [allEvents,  setAllEvents]  = useState<CalEvent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [missingKey, setMissingKey] = useState(false);

  // Filtros — estado local
  const [paises,   setPaises]   = useState<Set<string>>(new Set(['US', 'BR', 'EU', 'GB', 'DE']));
  const [soAlto,   setSoAlto]   = useState(false);

  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0];
    fetch(`/api/mercado/calendario?from=${hoje}&to=${hoje}&paises=US,BR,EU,GB,DE,JP,CA,CN&relevancia=high,medium`)
      .then(r => r.json())
      .then(d => {
        setLoading(false);
        if (d.missingKey) { setMissingKey(true); return; }
        const sorted = (d.events ?? []).sort((a: CalEvent, b: CalEvent) =>
          (a.time ?? '').localeCompare(b.time ?? '')
        );
        setAllEvents(sorted);
      })
      .catch(() => setLoading(false));
  }, []);

  const events = useMemo(() => allEvents.filter(e => {
    if (!paises.has(e.country)) return false;
    if (soAlto && e.impact !== 'high') return false;
    return true;
  }), [allEvents, paises, soAlto]);

  function togglePais(id: string) {
    setPaises(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  }

  const today   = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
  const hasBody = !loading && (allEvents.length > 0 || missingKey);

  return (
    <div className="dash-chart-card" style={{ marginBottom: 16 }}>

      <div className="dash-chart-header" style={{ alignItems: 'flex-start', marginBottom: hasBody ? 12 : 0, paddingBottom: hasBody ? 12 : 0, borderBottom: hasBody ? '1px solid var(--border)' : 'none' }}>
        <div className="dash-chart-meta" style={{ flex: 1 }}>
          <div className="dash-chart-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <CalendarDays size={14} style={{ color: 'var(--pe-color)' }} /> Agenda Econômica
          </div>
          <div className="dash-chart-sub">
            {today.charAt(0).toUpperCase() + today.slice(1)}
          </div>
        </div>

        {/* Filtros */}
        {!missingKey && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            {/* Países */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {PAISES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePais(p.id)}
                  style={{
                    fontSize: 11, padding: '3px 9px', borderRadius: 20, cursor: 'pointer',
                    border: `1px solid ${paises.has(p.id) ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
                    background: paises.has(p.id) ? 'rgba(16,185,129,0.1)' : 'transparent',
                    color: paises.has(p.id) ? 'var(--gain)' : 'var(--text-muted)',
                    fontWeight: paises.has(p.id) ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {p.flag} {p.label}
                </button>
              ))}
            </div>
            {/* Impacto */}
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                type="button"
                onClick={() => setSoAlto(false)}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                  border: `1px solid ${!soAlto ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                  background: !soAlto ? 'rgba(239,68,68,0.1)' : 'transparent',
                  color: !soAlto ? 'var(--loss)' : 'var(--text-muted)',
                  fontWeight: !soAlto ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                Alto + Médio
              </button>
              <button
                type="button"
                onClick={() => setSoAlto(true)}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                  border: `1px solid ${soAlto ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                  background: soAlto ? 'rgba(239,68,68,0.1)' : 'transparent',
                  color: soAlto ? 'var(--loss)' : 'var(--text-muted)',
                  fontWeight: soAlto ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                Só Alto
              </button>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Carregando...</div>
      )}

      {!loading && missingKey && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          Configure a chave{' '}
          <Link href="/integracoes" style={{ color: 'var(--gain)', textDecoration: 'none', fontWeight: 600 }}>
            Finnhub em Integrações
          </Link>{' '}
          para ver a agenda econômica.
        </div>
      )}

      {!loading && !missingKey && events.length === 0 && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          {allEvents.length === 0
            ? 'Agenda limpa — nenhum evento de impacto para hoje.'
            : 'Nenhum evento com os filtros selecionados.'}
        </div>
      )}

      {events.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['', 'País', 'Evento', 'Horário (BRT)', 'Previsão', 'Anterior', 'Atual'].map(h => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left', fontSize: 10, fontWeight: 700,
                      color: 'var(--text-muted)', textTransform: 'uppercase',
                      letterSpacing: '0.06em', paddingBottom: 8,
                      paddingRight: h === 'Atual' ? 0 : 16,
                      borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => {
                const isHigh   = e.impact === 'high';
                const dotColor = isHigh ? 'var(--loss)' : 'var(--pe-color)';
                const rowBorder = i < events.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none';
                return (
                  <tr key={i}>
                    <td style={{ padding: '10px 8px 10px 0', borderBottom: rowBorder }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, boxShadow: `0 0 4px ${dotColor}` }} />
                    </td>
                    <td style={{ padding: '10px 16px 10px 0', borderBottom: rowBorder, fontSize: 16, lineHeight: 1 }}>
                      {FLAGS[e.country] ?? e.country}
                    </td>
                    <td style={{ padding: '10px 16px 10px 0', borderBottom: rowBorder, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {e.event}
                    </td>
                    <td style={{ padding: '10px 16px 10px 0', borderBottom: rowBorder, fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                      {fmtTime(e.time)}
                    </td>
                    <td style={{ padding: '10px 16px 10px 0', borderBottom: rowBorder, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {fmtVal(e.estimate, e.unit)}
                    </td>
                    <td style={{ padding: '10px 16px 10px 0', borderBottom: rowBorder, fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {fmtVal(e.prev, e.unit)}
                    </td>
                    <td style={{
                      padding: '10px 0', borderBottom: rowBorder,
                      fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)',
                      fontWeight: e.actual != null ? 700 : 400,
                      color: e.actual != null ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}>
                      {fmtVal(e.actual, e.unit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
