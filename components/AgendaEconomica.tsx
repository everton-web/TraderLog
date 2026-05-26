'use client';
import { CalendarDays } from 'lucide-react';

export default function AgendaEconomica() {
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <div className="dash-chart-card" style={{ marginBottom: 16 }}>
      <div className="dash-chart-header" style={{ alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <div className="dash-chart-meta">
          <div className="dash-chart-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <CalendarDays size={14} style={{ color: 'var(--pe-color)' }} /> Agenda Econômica
          </div>
          <div className="dash-chart-sub">
            {today.charAt(0).toUpperCase() + today.slice(1)} — tempo real via Investing.com
          </div>
        </div>
      </div>

      <div style={{ borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <iframe
          src="https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone&countries=110,17,29,25,32,6,37,26,5,22,39,14,48,10,35,7,43,38,4,36,12,72&calType=day&timeZone=12&lang=12"
          width="100%"
          height="480"
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
