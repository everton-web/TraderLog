"use client";

import { useState } from "react";
import {
  CheckCircle2, Circle, XCircle, AlertTriangle,
  RotateCcw, TrendingUp, Target, ShieldAlert, BookOpen, Ban,
} from "lucide-react";

type Item = { id: string; texto: string; sub?: string };
type Cor = "blue" | "green" | "amber" | "purple";

type Secao = {
  id: string;
  label: string;
  cor: Cor;
  icone: React.ReactNode;
  itens: Item[];
};

const SECOES: Secao[] = [
  {
    id: "pre", label: "Pré-entrada", cor: "blue",
    icone: <TrendingUp size={13} />,
    itens: [
      { id: "pre-1", texto: "Defini o contexto do dia", sub: "Tendência, lateralização ou indefinido. Se lateral → não opero." },
      { id: "pre-2", texto: "Identifiquei os níveis relevantes", sub: "Máxima/mínima anterior, pivôs, abertura do dia." },
      { id: "pre-3", texto: "Não estou operando no emocional", sub: "Loss do dia dentro do limite. Não estou tentando recuperar." },
    ],
  },
  {
    id: "setup", label: "Setup", cor: "green",
    icone: <Target size={13} />,
    itens: [
      { id: "setup-1", texto: "Movimento a favor da tendência maior", sub: "Não compro em tendência de baixa, não vendo em tendência de alta." },
      { id: "setup-2", texto: "Pullback/pivot em região de valor", sub: "Preço retornou a suporte/resistência relevante, não no meio do nada." },
      { id: "setup-3", texto: "Há confirmação de price action no nível", sub: "Rejeição, engolfo, pin bar — sinal claro antes de entrar." },
    ],
  },
  {
    id: "risco", label: "Risco", cor: "amber",
    icone: <ShieldAlert size={13} />,
    itens: [
      { id: "risco-1", texto: "Stop definido antes da entrada", sub: "Ponto exato no gráfico. Máximo 500 pts." },
      { id: "risco-2", texto: "Alvo mínimo de 1:1.5", sub: "Stop 400 pts → alvo mínimo 600 pts. Abaixo disso não vale." },
      { id: "risco-3", texto: "Ainda tenho limite diário disponível", sub: "Não ultrapassei meu loss máximo do dia." },
    ],
  },
  {
    id: "pos", label: "Pós-operação", cor: "purple",
    icone: <BookOpen size={13} />,
    itens: [
      { id: "pos-1", texto: "Vou registrar no TraderLog imediatamente", sub: "Não saio da operação sem abrir o diário." },
    ],
  },
];

const TRAVAS: Item[] = [
  { id: "trava-1", texto: "Mercado está em lateralização clara" },
  { id: "trava-2", texto: "Já bati o loss máximo do dia" },
  { id: "trava-3", texto: "Estou entrando por impulso / sem setup definido" },
];

const TOTAL_MAIN = SECOES.reduce((acc, s) => acc + s.itens.length, 0);

const COR: Record<Cor, { badge: React.CSSProperties; check: string }> = {
  blue:   { badge: { background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }, check: '#3b82f6' },
  green:  { badge: { background: 'var(--gain-bg)', color: 'var(--gain)', border: '1px solid rgba(16,185,129,0.2)' }, check: 'var(--gain)' },
  amber:  { badge: { background: 'var(--pe-bg)', color: 'var(--pe-color)', border: '1px solid rgba(245,158,11,0.2)' }, check: 'var(--pe-color)' },
  purple: { badge: { background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }, check: '#8b5cf6' },
};

export function ChecklistEntrada() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [travas, setTravas]   = useState<Set<string>>(new Set());

  const totalChecked = [...checked].filter(id =>
    SECOES.flatMap(s => s.itens).some(i => i.id === id)
  ).length;

  const pct        = Math.round((totalChecked / TOTAL_MAIN) * 100);
  const killerAtivo = travas.size > 0;
  const completo    = totalChecked === TOTAL_MAIN && !killerAtivo;

  const toggle = (id: string, set: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    set(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const barColor = killerAtivo ? 'var(--loss)' : completo ? 'var(--gain)' : '#3b82f6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Progresso */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Progresso</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{totalChecked} / {TOTAL_MAIN}</span>
        </div>
        <div style={{ width: '100%', height: 6, background: 'var(--bg-surface)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.3s ease, background 0.3s ease' }} />
        </div>

        {killerAtivo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--loss-bg)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
            <Ban size={14} style={{ color: 'var(--loss)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--loss)', fontWeight: 600 }}>Trava ativa — não opere independente do setup.</span>
          </div>
        )}
        {!killerAtivo && completo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gain-bg)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
            <CheckCircle2 size={14} style={{ color: 'var(--gain)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--gain)', fontWeight: 600 }}>Checklist completo — entrada autorizada. Registre no TraderLog.</span>
          </div>
        )}
        {!killerAtivo && !completo && totalChecked >= 7 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--pe-bg)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
            <AlertTriangle size={14} style={{ color: 'var(--pe-color)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--pe-color)', fontWeight: 600 }}>{TOTAL_MAIN - totalChecked} iten(s) pendente(s) — revise antes de entrar.</span>
          </div>
        )}
      </div>

      {/* Seções */}
      {SECOES.map(secao => (
        <div key={secao.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em', ...COR[secao.cor].badge }}>
              {secao.icone}
              {secao.label}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {secao.itens.map(item => {
              const isChecked = checked.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id, setChecked)}
                  style={{
                    width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '11px 14px', borderRadius: 'var(--radius)',
                    border: `1px solid ${isChecked ? 'var(--border)' : 'var(--border-active)'}`,
                    background: isChecked ? 'var(--bg-surface)' : 'var(--bg-card)',
                    opacity: isChecked ? 0.6 : 1,
                    cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'var(--font)',
                  }}
                >
                  <div style={{ marginTop: 1, flexShrink: 0 }}>
                    {isChecked
                      ? <CheckCircle2 size={17} style={{ color: COR[secao.cor].check }} />
                      : <Circle size={17} style={{ color: 'var(--text-muted)' }} />
                    }
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                      {item.texto}
                    </p>
                    {item.sub && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.5 }}>{item.sub}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Travas absolutas */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--loss-bg)', color: 'var(--loss)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <XCircle size={13} /> Travas absolutas
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Se qualquer uma for verdadeira → não opere</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TRAVAS.map(trava => {
            const isAtiva = travas.has(trava.id);
            return (
              <button
                key={trava.id}
                onClick={() => toggle(trava.id, setTravas)}
                style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', borderRadius: 'var(--radius)',
                  border: `1px solid ${isAtiva ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                  background: isAtiva ? 'var(--loss-bg)' : 'var(--bg-card)',
                  cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'var(--font)',
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  {isAtiva
                    ? <XCircle size={17} style={{ color: 'var(--loss)' }} />
                    : <Circle size={17} style={{ color: 'var(--text-muted)' }} />
                  }
                </div>
                <p style={{ fontSize: 14, fontWeight: 500, color: isAtiva ? 'var(--loss)' : 'var(--text-primary)' }}>
                  {trava.texto}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => { setChecked(new Set()); setTravas(new Set()); }}
          className="btn btn-ghost"
          style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RotateCcw size={13} /> Reiniciar checklist
        </button>
      </div>
    </div>
  );
}
