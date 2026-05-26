'use client';
import { useState, useEffect } from 'react';
import { BarChart2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

type Ativo = 'WIN' | 'WDO';

interface OhlcData {
  data:       string;
  ativo:      string;
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

function AmmfCard({ ativo, ohlc, loading }: { ativo: Ativo; ohlc: OhlcData | null; loading: boolean }) {
  const range = ohlc ? ohlc.maximo - ohlc.minimo : null;
  const dir   = ohlc
    ? ohlc.fechamento > ohlc.abertura ? 'alta' : ohlc.fechamento < ohlc.abertura ? 'baixa' : 'lateral'
    : null;
  const dirColor = dir === 'alta' ? 'var(--gain)' : dir === 'baixa' ? 'var(--loss)' : 'var(--text-muted)';

  return (
    <div style={{ flex: 1, minWidth: 0, background: 'var(--bg-surface)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
          {ativo}FUT
        </span>
        {dir && (
          <span style={{ fontSize: 10, color: dirColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {dir}
          </span>
        )}
      </div>

      {loading && !ohlc && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', height: 42 }}>
          <Loader2 size={11} className="spin" /> carregando...
        </div>
      )}

      {!loading && !ohlc && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', height: 42, display: 'flex', alignItems: 'center' }}>
          Indisponível
        </div>
      )}

      {ohlc && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 14px' }}>
            {([
              { label: 'Abertura',   val: ohlc.abertura,   color: undefined },
              { label: 'Máxima',     val: ohlc.maximo,     color: 'var(--gain)' },
              { label: 'Mínima',     val: ohlc.minimo,     color: 'var(--loss)' },
              { label: 'Fechamento', val: ohlc.fechamento, color: dirColor },
            ] as { label: string; val: number; color: string | undefined }[]).map(({ label, val, color }) => (
              <div key={label}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: color ?? 'var(--text-primary)' }}>
                  {val.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 12 }}>
            <div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Range </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{range} pts</span>
            </div>
            <div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Ref. </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ohlc.data}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function MercadoResumo() {
  const [ativo,       setAtivo]       = useState<Ativo>('WIN');
  const [loading,     setLoading]     = useState(false);
  const [loadingOhlc, setLoadingOhlc] = useState(false);
  const [resumo,      setResumo]      = useState('');
  const [winOhlc,     setWinOhlc]     = useState<OhlcData | null>(null);
  const [wdoOhlc,     setWdoOhlc]     = useState<OhlcData | null>(null);
  const [error,       setError]       = useState('');

  async function fetchOhlcBoth() {
    setLoadingOhlc(true);
    try {
      const [winRes, wdoRes] = await Promise.allSettled([
        fetch('/api/mercado/ohlc?ativo=WIN').then(r => r.json()),
        fetch('/api/mercado/ohlc?ativo=WDO').then(r => r.json()),
      ]);
      if (winRes.status === 'fulfilled' && !winRes.value.error) setWinOhlc(winRes.value as OhlcData);
      if (wdoRes.status === 'fulfilled' && !wdoRes.value.error) setWdoOhlc(wdoRes.value as OhlcData);
    } finally {
      setLoadingOhlc(false);
    }
  }

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
      const today = new Date().toISOString().split('T')[0];
      try { localStorage.setItem(`traderlog-resumo-${av}-${today}`, JSON.stringify({ resumo: data.resumo })); } catch {}
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const cached = localStorage.getItem(`traderlog-resumo-WIN-${today}`);
      if (cached) {
        const { resumo: r } = JSON.parse(cached);
        if (r) setResumo(r);
      }
    } catch {}
    fetchOhlcBoth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAtivoChange(a: Ativo) {
    setAtivo(a);
    setResumo('');
    setError('');
    const today = new Date().toISOString().split('T')[0];
    try {
      const cached = localStorage.getItem(`traderlog-resumo-${a}-${today}`);
      if (cached) {
        const { resumo: r } = JSON.parse(cached);
        if (r) setResumo(r);
      }
    } catch {}
  }

  const today      = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
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

      {/* AMMF — WIN e WDO lado a lado */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <AmmfCard ativo="WIN" ohlc={winOhlc} loading={loadingOhlc} />
        <AmmfCard ativo="WDO" ohlc={wdoOhlc} loading={loadingOhlc} />
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--loss)', paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 10 }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {loading && !resumo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--text-muted)', paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 10 }}>
          <Loader2 size={13} className="spin" /> Gerando análise do mercado...
        </div>
      )}

      {resumo && (
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 10 }}>
          {renderResumo(resumo)}
        </div>
      )}
    </div>
  );
}
