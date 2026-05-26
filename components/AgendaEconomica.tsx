'use client';
import { useState } from 'react';
import { CalendarDays } from 'lucide-react';

const BASE    = 'https://sslecal2.investing.com';
const COLS    = 'exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous';
const CTRIES  = '110,17,29,25,32,6,37,26,5,22,39,14,48,10,35,7,43,38,4,36,12,72';

type Period     = 'day' | 'week' | 'nextWeek';
type Importance = '3' | '2,3' | '1,2,3';

const PERIOD_OPTS: { value: Period; label: string }[] = [
  { value: 'day',      label: 'Hoje' },
  { value: 'week',     label: 'Esta semana' },
  { value: 'nextWeek', label: 'Próx. semana' },
];

const IMP_OPTS: { value: Importance; label: string }[] = [
  { value: '3',     label: 'Alto impacto' },
  { value: '2,3',   label: 'Médio+' },
  { value: '1,2,3', label: 'Todos' },
];

export default function AgendaEconomica() {
  const [period,     setPeriod]     = useState<Period>('day');
  const [importance, setImportance] = useState<Importance>('2,3');

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
  const src   = `${BASE}?columns=${COLS}&features=datepicker,timezone&countries=${CTRIES}&calType=${period}&importance=${importance}&timeZone=12&lang=12`;

  return (
    <div className="dash-chart-card" style={{ marginBottom: 16 }}>
      <div className="dash-chart-header" style={{ alignItems: 'flex-start', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <div className="dash-chart-meta">
          <div className="dash-chart-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <CalendarDays size={14} style={{ color: 'var(--pe-color)' }} /> Agenda Econômica
          </div>
          <div className="dash-chart-sub">
            {today.charAt(0).toUpperCase() + today.slice(1)} — tempo real via Investing.com
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          <div className="toggle-group">
            {PERIOD_OPTS.map(o => (
              <button
                key={o.value}
                type="button"
                className={`toggle-btn${period === o.value ? ' active' : ''}`}
                onClick={() => setPeriod(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="toggle-group">
            {IMP_OPTS.map(o => (
              <button
                key={o.value}
                type="button"
                className={`toggle-btn${importance === o.value ? ' active' : ''}`}
                onClick={() => setImportance(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <iframe
          key={src}
          src={src}
          width="100%"
          height="500"
          frameBorder="0"
          allowTransparency={true}
          marginWidth={0}
          marginHeight={0}
          style={{ display: 'block', border: 'none' }}
          title="Agenda Econômica"
        />
      </div>
    </div>
  );
}
