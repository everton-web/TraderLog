'use client';
import { useState, useEffect } from 'react';
import { BarChart2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

type Ativo = 'WIN' | 'WDO';

interface OhlcData {
  data:       string;
  abertura:   number;
  maximo:     number;
  minimo:     number;
  fechamento: number;
}

function renderResumo(text: string) {
  return text.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} style={{ height: 4 }} />;
    if (/^##\s/.test(t))
      return (
        <p key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)', marginTop: i === 0 ? 0 : 12, marginBottom: 4, borderBottom: '1px solid var(--border)', paddingBottom: 3 }}>
          {t.replace(/^#+\s/, '')}
        </p>
      );
    if (/^[-•*]\s/.test(t))
      return (
        <p key={i} style={{ paddingLeft: 14, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', position: 'relative', marginTop: 4 }}>
          <span style={{ position: 'absolute', left: 2, color: 'var(--gain)' }}>•</span>
          {t.replace(/^[-•*]\s/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
        </p>
      );
    return <p key={i} style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 3 }}>{t.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
  });
}

export default function MercadoResumo() {
  const [ativo,   setAtivo]   = useState<Ativo>('WIN');
  const [loading, setLoading] = useState(false);
  const [resumo,  setResumo]  = useState('');
  const [ohlc,    setOhlc]    = useState<OhlcData | null>(null);
  const [error,   setError]   = useState('');

  async function gerar(av: Ativo = ativo) {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/mercado/resumo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: av }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResumo(data.resumo ?? '');
      setOhlc(data.ohlc ?? null);
      const today = new Date().toISOString().split('T')[0];
      try { localStorage.setItem(`traderlog-resumo-${av}-${today}`, JSON.stringify({ resumo: data.resumo, ohlc: data.ohlc })); } catch {}
    } finally {
      setLoading(false);
    }
  }

  // Auto-gera na primeira carga — usa cache do dia se disponível
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const cached = localStorage.getItem(`traderlog-resumo-WIN-${today}`);
      if (cached) {
        const { resumo: r, ohlc: o } = JSON.parse(cached);
        if (r) { setResumo(r); if (o) setOhlc(o); return; }
      }
    } catch {}
    gerar('WIN');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAtivoChange(a: Ativo) {
    setAtivo(a);
    const today = new Date().toISOString().split('T')[0];
    try {
      const cached = localStorage.getItem(`traderlog-resumo-${a}-${today}`);
      if (cached) {
        const { resumo: r, ohlc: o } = JSON.parse(cached);
        if (r) { setResumo(r); if (o) setOhlc(o); return; }
      }
    } catch {}
    setResumo('');
    setOhlc(null);
    setError('');
  }

  const today    = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
  const hasContent = resumo || error;

  return (
    <div className="dash-chart-card" style={{ marginBottom: 16 }}>

      {/* Header */}
      <div className="dash-chart-header" style={{ alignItems: 'flex-start' }}>
        <div className="dash-chart-meta" style={{ flex: 1 }}>
          <div className="dash-chart-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <BarChart2 size={14} style={{ color: 'var(--gain)' }} /> Resumo do Mercado
          </div>
          <div className="dash-chart-sub">
            {today.charAt(0).toUpperCase() + today.slice(1)} — AMMF de ontem + análise IA automática
          </div>

          {ohlc && (
            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              {([
                { label: 'Abertura',   val: ohlc.abertura },
                { label: 'Máxima',     val: ohlc.maximo },
                { label: 'Mínima',     val: ohlc.minimo },
                { label: 'Fechamento', val: ohlc.fechamento },
                { label: 'Range',      val: ohlc.maximo - ohlc.minimo, suffix: ' pts' },
              ] as { label: string; val: number; suffix?: string }[]).map(({ label, val, suffix }) => (
                <div key={label}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 1 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {val.toLocaleString('pt-BR')}{suffix ?? ''}
                  </span>
                </div>
              ))}
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 1 }}>Data ref.</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{ohlc.data}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <div className="toggle-group">
            {(['WIN', 'WDO'] as Ativo[]).map(a => (
              <button
                key={a}
                type="button"
                className={`toggle-btn${ativo === a ? ' active' : ''}`}
                style={{ fontSize: 'var(--text-xs)', padding: '4px 12px' }}
                onClick={() => handleAtivoChange(a)}
                disabled={loading}
              >
                {a}
              </button>
            ))}
          </div>
          <button
            className="btn btn-primary"
            style={{ fontSize: 'var(--text-xs)', padding: '5px 14px', whiteSpace: 'nowrap' }}
            onClick={() => gerar()}
            disabled={loading}
          >
            {loading
              ? <><Loader2 size={12} className="spin" /> Analisando...</>
              : hasContent
                ? <><RefreshCw size={12} /> Regerar</>
                : <><BarChart2 size={12} /> Gerar resumo</>}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--loss)', paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {loading && !resumo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--text-muted)', paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <Loader2 size={13} className="spin" /> Gerando análise do mercado...
        </div>
      )}

      {resumo && (
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8 }}>
          {renderResumo(resumo)}
        </div>
      )}
    </div>
  );
}
