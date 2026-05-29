'use client';
import { useState, useEffect } from 'react';
import { BarChart2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

type Ativo = 'WIN' | 'WDO';

const ATIVO_COLOR: Record<Ativo, string> = { WIN: '#2563eb', WDO: '#7c3aed' };

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
    return (
      <p key={i} style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 3 }}>
        {t.replace(/\*\*(.*?)\*\*/g, '$1')}
      </p>
    );
  });
}

function MercadoCard({ ativo }: { ativo: Ativo }) {
  const today      = new Date().toISOString().split('T')[0];
  const ammfKey    = `traderlog-ammf-${ativo}-${today}`;
  const resumoKey  = `traderlog-resumo-${ativo}-${today}`;

  const [abertura,    setAbertura]    = useState('');
  const [maximo,      setMaximo]      = useState('');
  const [minimo,      setMinimo]      = useState('');
  const [fechamento,  setFechamento]  = useState('');
  const [loading,     setLoading]     = useState(false);
  const [resumo,      setResumo]      = useState('');
  const [error,       setError]       = useState('');

  useEffect(() => {
    try {
      const ammf = localStorage.getItem(ammfKey);
      if (ammf) {
        const p = JSON.parse(ammf);
        if (p.abertura)   setAbertura(String(p.abertura));
        if (p.maximo)     setMaximo(String(p.maximo));
        if (p.minimo)     setMinimo(String(p.minimo));
        if (p.fechamento) setFechamento(String(p.fechamento));
      }
      const cached = localStorage.getItem(resumoKey);
      if (cached) {
        const { resumo: r } = JSON.parse(cached);
        if (r) setResumo(r);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAmmf = abertura && maximo && minimo && fechamento;
  const color   = ATIVO_COLOR[ativo];

  const pctVar  = hasAmmf && Number(abertura) > 0
    ? ((Number(fechamento) - Number(abertura)) / Number(abertura)) * 100
    : null;
  const dirColor = pctVar == null ? 'var(--text-muted)' : pctVar > 0 ? 'var(--gain)' : pctVar < 0 ? 'var(--loss)' : 'var(--text-muted)';

  async function gerar() {
    if (!hasAmmf) return;
    setLoading(true);
    setError('');
    const ohlc = { abertura: Number(abertura), maximo: Number(maximo), minimo: Number(minimo), fechamento: Number(fechamento) };
    try {
      localStorage.setItem(ammfKey, JSON.stringify(ohlc));
      const res  = await fetch('/api/mercado/resumo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo, ohlc }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResumo(data.resumo ?? '');
      try { localStorage.setItem(resumoKey, JSON.stringify({ resumo: data.resumo })); } catch {}
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '5px 8px', fontSize: 13, fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ flex: 1, minWidth: 0, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#fff', background: color, borderRadius: 4, padding: '2px 8px', lineHeight: 1.7 }}>
          {ativo}
        </span>
        {pctVar != null && (
          <span style={{ fontSize: 13, fontWeight: 700, color: dirColor }}>
            {pctVar >= 0 ? '+' : ''}{pctVar.toFixed(2)}%
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>AMMF de ontem</span>
      </div>

      {/* Input grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px', marginBottom: 10 }}>
        {([
          { label: 'Abertura',   val: abertura,   set: setAbertura },
          { label: 'Máxima',     val: maximo,     set: setMaximo },
          { label: 'Mínima',     val: minimo,     set: setMinimo },
          { label: 'Fechamento', val: fechamento, set: setFechamento },
        ] as { label: string; val: string; set: (v: string) => void }[]).map(f => (
          <div key={f.label}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{f.label}</span>
            <input
              type="number"
              step="1"
              placeholder={ativo === 'WIN' ? '130000' : '5750'}
              value={f.val}
              onChange={e => f.set(e.target.value)}
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      {/* Botão gerar */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Análise IA</span>
        <button
          className="btn btn-primary"
          style={{ fontSize: 'var(--text-xs)', padding: '4px 12px', whiteSpace: 'nowrap' }}
          onClick={gerar}
          disabled={loading || !hasAmmf}
        >
          {loading
            ? <><Loader2 size={11} className="spin" /> Analisando...</>
            : resumo
              ? <><RefreshCw size={11} /> Regerar</>
              : <><BarChart2 size={11} /> Gerar</>}
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--loss)', marginTop: 8 }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {loading && !resumo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          <Loader2 size={11} className="spin" /> Gerando análise...
        </div>
      )}

      {resumo && (
        <div style={{ marginTop: 10 }}>
          {renderResumo(resumo)}
        </div>
      )}
    </div>
  );
}

export default function MercadoResumo() {
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <div className="dash-chart-card" style={{ marginBottom: 16 }}>
      <div className="dash-chart-header" style={{ marginBottom: 12 }}>
        <div className="dash-chart-meta">
          <div className="dash-chart-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <BarChart2 size={14} style={{ color: 'var(--gain)' }} /> Resumo do Mercado
          </div>
          <div className="dash-chart-sub">
            {today.charAt(0).toUpperCase() + today.slice(1)} — insira o AMMF de ontem para gerar a análise
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <MercadoCard ativo="WIN" />
        <MercadoCard ativo="WDO" />
      </div>
    </div>
  );
}
