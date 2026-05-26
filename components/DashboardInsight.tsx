'use client';
import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { Operacao } from '@/lib/types';

interface Props {
  ops: Operacao[];
}

export default function DashboardInsight({ ops }: Props) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function generate() {
    setLoading(true);
    setError('');

    const compactOps = ops.slice(-30).map(o => ({
      dia_semana: o.dia_semana,
      ativo:      o.ativo,
      situacao:   o.situacao,
      setup:      o.setup,
      rs_final:   o.rs_final,
      pts_final:  o.pts_final,
    }));

    const res  = await fetch('/api/ia/insights', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ops: compactOps }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.error) setError(data.error);
    else setInsight(data.insight);
  }

  if (ops.length < 3) {
    return (
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Registre pelo menos 3 operações para ativar o coach.
      </p>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
        <Loader2 size={13} className="spin" /> Analisando...
      </div>
    );
  }

  if (!insight) {
    return (
      <>
        <button className="insight-btn" onClick={generate}>
          <Sparkles size={12} /> Gerar análise
        </button>
        {error && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--text-sm)', color: 'var(--loss)', marginTop: 8, lineHeight: 1.4 }}>
            <AlertCircle size={12} /> {error}
          </p>
        )}
      </>
    );
  }

  const lines = insight
    .split('\n')
    .map(l => l.trim().replace(/^[•\-*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1'))
    .filter(Boolean);

  return (
    <div className="insight-result">
      {lines.map((line, i) => (
        <p key={i} className="insight-line">{line}</p>
      ))}
      <button className="insight-refresh" onClick={generate}>
        <RefreshCw size={10} /> Atualizar
      </button>
    </div>
  );
}
