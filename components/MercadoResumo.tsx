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

function MercadoCard({ ativo, ohlc, loadingOhlc }: { ativo: Ativo; ohlc: OhlcData | null; loadingOhlc: boolean }) {
  const [loading, setLoading] = useState(false);
  const [resumo,  setResumo]  = useState('');
  const [error,   setError]   = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const cached = localStorage.getItem(`traderlog-resumo-${ativo}-${today}`);
      if (cached) {
        const { resumo: r } = JSON.parse(cached);
        if (r) setResumo(r);
      }
    } catch {}
  }, [ativo]);

  async function gerar() {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/mercado/resumo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResumo(data.resumo ?? '');
      const today = new Date().toISOString().split('T')[0];
      try { localStorage.setItem(`traderlog-resumo-${ativo}-${today}`, JSON.stringify({ resumo: data.resumo })); } catch {}
    } finally {
      setLoading(false);
    }
  }

  const hasContent = resumo || error;
  const color      = ATIVO_COLOR[ativo];

  const pctVar = ohlc && ohlc.abertura > 0
    ? ((ohlc.fechamento - ohlc.abertura) / ohlc.abertura) * 100
    : null;
  const dir      = pctVar != null ? (pctVar > 0 ? 'alta' : pctVar < 0 ? 'baixa' : 'lateral') : null;
  const dirColor = dir === 'alta' ? 'var(--gain)' : dir === 'baixa' ? 'var(--loss)' : 'var(--text-muted)';
  const pctStr   = pctVar != null ? `${pctVar >= 0 ? '+' : ''}${pctVar.toFixed(2)}%` : null;
  const range    = ohlc ? ohlc.maximo - ohlc.minimo : null;
  const frase    = ohlc && pctStr
    ? `Fechou em ${ohlc.fechamento.toLocaleString('pt-BR')} (${pctStr}). Máxima ${ohlc.maximo.toLocaleString('pt-BR')}, mínima ${ohlc.minimo.toLocaleString('pt-BR')}.`
    : null;

  return (
    <div style={{ flex: 1, minWidth: 0, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Ativo tag + variação + data */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#fff', background: color, borderRadius: 4, padding: '2px 8px', lineHeight: 1.7 }}>
          {ativo}
        </span>
        {pctStr && (
          <span style={{ fontSize: 13, fontWeight: 700, color: dirColor }}>{pctStr}</span>
        )}
        {ohlc && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{ohlc.data}</span>
        )}
      </div>

      {/* AMMF */}
      {loadingOhlc && !ohlc && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', height: 64 }}>
          <Loader2 size={11} className="spin" /> carregando...
        </div>
      )}

      {ohlc && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 16px', marginBottom: 8 }}>
            {([
              { label: 'Abertura',   val: ohlc.abertura,   color: undefined },
              { label: 'Máxima',     val: ohlc.maximo,     color: 'var(--gain)' },
              { label: 'Mínima',     val: ohlc.minimo,     color: 'var(--loss)' },
              { label: 'Fechamento', val: ohlc.fechamento, color: dirColor },
            ] as { label: string; val: number; color: string | undefined }[]).map(({ label, val, color: c }) => (
              <div key={label}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: c ?? 'var(--text-primary)' }}>
                  {val.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            Range: <strong style={{ color: 'var(--text-secondary)' }}>{range} pts</strong>
          </div>

          {frase && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: 8, marginBottom: 12 }}>
              {frase}
            </div>
          )}
        </>
      )}

      {/* Divisor + botão Gerar */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Análise IA</span>
        <button
          className="btn btn-primary"
          style={{ fontSize: 'var(--text-xs)', padding: '4px 12px', whiteSpace: 'nowrap' }}
          onClick={gerar}
          disabled={loading}
        >
          {loading
            ? <><Loader2 size={11} className="spin" /> Analisando...</>
            : hasContent
              ? <><RefreshCw size={11} /> Regerar</>
              : <><BarChart2 size={11} /> Gerar</>}
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--loss)', marginTop: 8 }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {/* Carregando */}
      {loading && !resumo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          <Loader2 size={11} className="spin" /> Gerando análise...
        </div>
      )}

      {/* Resumo IA */}
      {resumo && (
        <div style={{ marginTop: 10 }}>
          {renderResumo(resumo)}
        </div>
      )}
    </div>
  );
}

export default function MercadoResumo() {
  const [loadingOhlc, setLoadingOhlc] = useState(false);
  const [winOhlc,     setWinOhlc]     = useState<OhlcData | null>(null);
  const [wdoOhlc,     setWdoOhlc]     = useState<OhlcData | null>(null);

  useEffect(() => {
    async function fetchBoth() {
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
    fetchBoth();
  }, []);

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <div className="dash-chart-card" style={{ marginBottom: 16 }}>
      <div className="dash-chart-header" style={{ marginBottom: 12 }}>
        <div className="dash-chart-meta">
          <div className="dash-chart-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <BarChart2 size={14} style={{ color: 'var(--gain)' }} /> Resumo do Mercado
          </div>
          <div className="dash-chart-sub">
            {today.charAt(0).toUpperCase() + today.slice(1)} — AMMF de ontem + análise IA
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <MercadoCard ativo="WIN" ohlc={winOhlc} loadingOhlc={loadingOhlc} />
        <MercadoCard ativo="WDO" ohlc={wdoOhlc} loadingOhlc={loadingOhlc} />
      </div>
    </div>
  );
}
