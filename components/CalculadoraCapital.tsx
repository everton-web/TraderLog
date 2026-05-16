"use client";

import { useState } from "react";
import { TrendingUp, ShieldAlert, Target, Wallet, RotateCcw } from "lucide-react";

function fmt(v: number): string {
  return "R$ " + Math.round(v).toLocaleString("pt-BR");
}

export function CalculadoraCapital() {
  const [stop,     setStop]     = useState(500);
  const [rrRaw,    setRrRaw]    = useState(15);
  const [maxStops, setMaxStops] = useState(2);

  const rr     = rrRaw / 10;
  const risco  = stop * 2 * 0.2;
  const alvo   = stop * rr * 2 * 0.2;
  const lossD  = risco * maxStops;
  const colchao = lossD * 3;
  const margem  = 310;

  const capMin  = margem + colchao;
  const capIdeal = capMin + lossD * 2;
  const capConf  = capIdeal * 1.4;

  const metaDia  = Math.round(alvo * 0.7);
  const metaSem  = metaDia * 3;
  const metaMes1 = Math.round(metaSem * 4 * 0.6);
  const metaMes2 = Math.round(metaSem * 4 * 0.8);

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '16px 18px',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%', height: 4, appearance: 'none', background: 'var(--bg-surface)',
    borderRadius: 2, outline: 'none', cursor: 'pointer', accentColor: '#3b82f6',
  };

  const faseColors = [
    'rgba(59,130,246,0.7)',
    'var(--pe-color)',
    'var(--gain)',
    'rgba(139,92,246,0.7)',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Parâmetros */}
      <div style={card}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
          Parâmetros da operação
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[
            { label: 'Stop por operação (pts)', val: stop, min: 100, max: 500, step: 50, set: setStop, display: String(stop) },
            { label: 'Alvo mínimo (R:R)',       val: rrRaw, min: 10, max: 30, step: 1, set: setRrRaw, display: rr.toFixed(1) },
            { label: 'Loss máx. diário (stops)',val: maxStops, min: 1, max: 4, step: 1, set: setMaxStops, display: String(maxStops) },
          ].map(s => (
            <div key={s.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{s.display}</span>
              </div>
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                onChange={e => s.set(Number(e.target.value))} style={sliderStyle} />
            </div>
          ))}
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Risco por operação', valor: fmt(risco), sub: `${stop} pts × 2 contr.`, icon: <ShieldAlert size={13} style={{ color: 'var(--pe-color)' }} /> },
          { label: 'Alvo por operação',  valor: fmt(alvo),  sub: `${Math.round(stop * rr)} pts × 2 contr.`, icon: <Target size={13} style={{ color: 'var(--gain)' }} /> },
          { label: 'Loss máximo diário', valor: fmt(lossD), sub: `${maxStops} stop(s)`, icon: <TrendingUp size={13} style={{ color: 'var(--loss)' }} /> },
          { label: 'Colchão (3 dias ruins)', valor: fmt(colchao), sub: `3 dias × ${fmt(lossD)}/dia`, icon: <Wallet size={13} style={{ color: '#3b82f6' }} /> },
        ].map(m => (
          <div key={m.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              {m.icon}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</span>
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{m.valor}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Capital recomendado */}
      <div style={card}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Capital recomendado
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            {
              label: 'Mínimo absoluto', sub: 'Margem + 3 dias de loss máximo.',
              valor: fmt(capMin), tag: 'mínimo',
              tagStyle: { background: 'var(--pe-bg)', color: 'var(--pe-color)' },
              bg: 'transparent',
            },
            {
              label: 'Capital ideal ★', sub: '+ margem psicológica (2 dias de loss).',
              valor: fmt(capIdeal), tag: 'adequado',
              tagStyle: { background: 'var(--gain-bg)', color: 'var(--gain)' },
              bg: 'var(--bg-surface)',
            },
            {
              label: 'Capital confortável', sub: 'Opera sem ansiedade de capital.',
              valor: fmt(capConf), tag: 'confortável',
              tagStyle: { background: 'var(--gain-bg)', color: 'var(--gain)' },
              bg: 'transparent',
            },
          ].map((r, i) => (
            <div key={r.label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0', background: r.bg,
              borderTop: i > 0 ? '1px solid var(--border)' : 'none',
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: i === 1 ? 700 : 500, color: 'var(--text-primary)' }}>{r.label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.sub}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{r.valor}</p>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, display: 'inline-block', marginTop: 3, ...r.tagStyle }}>
                  {r.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fases */}
      <div style={card}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Fases do plano
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Fase 1 — agora', titulo: 'Simulador (2–4 semanas)', desc: `2 contratos no replay. Meta: 60%+ de acerto com R:R ${rr.toFixed(1)} em 50 operações. Registrar tudo no TraderLog.` },
            { label: 'Fase 2 — capital mínimo', titulo: `Juntar ${fmt(capMin)} → 1 contrato real`, desc: `1 contrato até atingir ${fmt(capIdeal)}. Risco por op: ${fmt(risco / 2)}. Loss diário máx: ${fmt(lossD / 2)}. Reinveste os lucros.` },
            { label: 'Fase 3 — capital ideal', titulo: `Com ${fmt(capIdeal)} → 2 contratos`, desc: `Risco por op: ${fmt(risco)}. Loss diário máx: ${fmt(lossD)}. Meta conservadora: ${fmt(metaDia)}/dia — ${fmt(metaSem)}/semana.` },
            { label: 'Fase 4 — crescimento', titulo: `Acima de ${fmt(capConf)} → consistência`, desc: `Meta mensal realista: ${fmt(metaMes1)}–${fmt(metaMes2)}. Nunca sacar abaixo de ${fmt(capIdeal)}.` },
          ].map((fase, i) => (
            <div key={fase.label} style={{ borderLeft: `2px solid ${faseColors[i]}`, paddingLeft: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{fase.label}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{fase.titulo}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 3 }}>{fase.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => { setStop(500); setRrRaw(15); setMaxStops(2); }}
          className="btn btn-ghost" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <RotateCcw size={13} /> Resetar parâmetros
        </button>
      </div>
    </div>
  );
}
