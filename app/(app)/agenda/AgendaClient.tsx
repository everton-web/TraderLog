'use client';
import { useState, useMemo } from 'react';
import { Calendar, ExternalLink } from 'lucide-react';

const PAISES = [
  { id: 72,  label: 'Brasil',         flag: '🇧🇷', checked: true },
  { id: 5,   label: 'EUA',            flag: '🇺🇸', checked: true },
  { id: 22,  label: 'Zona do Euro',   flag: '🇪🇺', checked: true },
  { id: 4,   label: 'Alemanha',       flag: '🇩🇪', checked: false },
  { id: 12,  label: 'Reino Unido',    flag: '🇬🇧', checked: false },
  { id: 35,  label: 'Japão',          flag: '🇯🇵', checked: false },
  { id: 6,   label: 'Canadá',         flag: '🇨🇦', checked: false },
  { id: 36,  label: 'China',          flag: '🇨🇳', checked: false },
  { id: 25,  label: 'França',         flag: '🇫🇷', checked: false },
  { id: 43,  label: 'Austrália',      flag: '🇦🇺', checked: false },
];

const IMPORTANCIA = [
  { value: '1', label: 'Alto', color: 'var(--loss)' },
  { value: '2', label: 'Médio', color: 'var(--pe-color)' },
  { value: '3', label: 'Baixo', color: 'var(--text-muted)' },
];

const CAL_TYPES = [
  { value: 'day',   label: 'Dia' },
  { value: 'week',  label: 'Semana' },
  { value: 'month', label: 'Mês' },
];

export default function AgendaClient() {
  const [paises,      setPaises]      = useState<Record<number, boolean>>(
    Object.fromEntries(PAISES.map(p => [p.id, p.checked]))
  );
  const [importancia, setImportancia] = useState<Record<string, boolean>>({ '1': true, '2': true, '3': false });
  const [calType,     setCalType]     = useState('day');

  function togglePais(id: number) {
    setPaises(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleImp(val: string) {
    setImportancia(prev => ({ ...prev, [val]: !prev[val] }));
  }

  const iframeSrc = useMemo(() => {
    const paisIds = PAISES.filter(p => paises[p.id]).map(p => p.id).join(',');
    const impIds  = IMPORTANCIA.filter(i => importancia[i.value]).map(i => i.value).join(',');
    const params  = new URLSearchParams({
      columns:  'exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous',
      features: 'datepicker,timezone',
      countries: paisIds || '72',
      importance: impIds || '1',
      calType,
      timeZone: '12',
      lang:     '12',
    });
    return `https://sslecal2.investing.com?${params.toString()}`;
  }, [paises, importancia, calType]);

  return (
    <div className="page-content">

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Calendar size={16} style={{ color: 'var(--gain)' }} />
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Agenda Econômica
          </h1>
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
          Calendário econômico ao vivo com filtros por país e relevância
        </p>
      </div>

      {/* Filters */}
      <div className="dash-chart-card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Países */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Países
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PAISES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePais(p.id)}
                  style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 20,
                    border: `1px solid ${paises[p.id] ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
                    background: paises[p.id] ? 'rgba(16,185,129,0.1)' : 'transparent',
                    color: paises[p.id] ? 'var(--gain)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: paises[p.id] ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {p.flag} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Importância */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Importância
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {IMPORTANCIA.map(imp => (
                <button
                  key={imp.value}
                  type="button"
                  onClick={() => toggleImp(imp.value)}
                  style={{
                    fontSize: 12,
                    padding: '4px 12px',
                    borderRadius: 20,
                    border: `1px solid ${importancia[imp.value] ? imp.color : 'var(--border)'}`,
                    background: importancia[imp.value] ? `${imp.color}18` : 'transparent',
                    color: importancia[imp.value] ? imp.color : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: importancia[imp.value] ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {imp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Período */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Período
            </div>
            <div className="toggle-group">
              {CAL_TYPES.map(ct => (
                <button
                  key={ct.value}
                  type="button"
                  className={`toggle-btn${calType === ct.value ? ' active' : ''}`}
                  style={{ fontSize: 'var(--text-xs)', padding: '4px 12px' }}
                  onClick={() => setCalType(ct.value)}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Link externo */}
          <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
            <a
              href="https://br.investing.com/economic-calendar/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
            >
              <ExternalLink size={12} /> Abrir no Investing.com
            </a>
          </div>

        </div>
      </div>

      {/* Iframe */}
      <div className="dash-chart-card" style={{ padding: 0, overflow: 'hidden' }}>
        <iframe
          src={iframeSrc}
          width="100%"
          height="680"
          frameBorder="0"
          allowTransparency={true}
          marginWidth={0}
          marginHeight={0}
          style={{ display: 'block', border: 'none' }}
          title="Calendário Econômico"
        />
      </div>

    </div>
  );
}
