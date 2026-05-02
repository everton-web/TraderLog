'use client';
import dynamic from 'next/dynamic';
import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { X, DollarSign, Activity, Target, Clock } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { calcEstatisticas } from '@/lib/calculations';
import { fmtRS, fmtPct } from '@/lib/formatters';
import OperacoesTable from '@/components/OperacoesTable';
import type { Operacao } from '@/lib/types';

ChartJS.register(ArcElement, Tooltip, Legend);

const CapitalChart = dynamic(() => import('@/components/charts/CapitalChart'), { ssr: false });

export default function DashboardClient({ ops, capitalInicial }: { ops: Operacao[]; capitalInicial: number }) {
  const [de, setDe]   = useState('');
  const [ate, setAte] = useState('');

  const filtered = useMemo(() => ops.filter(o => {
    if (de  && o.data < de)  return false;
    if (ate && o.data > ate) return false;
    return true;
  }), [ops, de, ate]);

  const stat         = useMemo(() => calcEstatisticas(filtered, capitalInicial), [filtered, capitalInicial]);
  const capitalAtual = capitalInicial + stat.rsTotal;
  const delta        = capitalAtual - capitalInicial;
  const pctDelta     = capitalInicial > 0 ? (delta / capitalInicial) * 100 : 0;
  const hasFilter    = !!(de || ate);

  // Hoje
  const today     = new Date().toISOString().split('T')[0];
  const todayOps  = filtered.filter(o => o.data === today);
  const todayRS   = todayOps.reduce((s, o) => s + (o.rs_final || 0), 0);
  const todayAcerto = todayOps.length > 0
    ? todayOps.filter(o => o.situacao === 'Gain').length / todayOps.filter(o => o.situacao !== null).length
    : null;

  // Melhor / pior dia
  const byDay: Record<string, number> = {};
  filtered.forEach(o => { byDay[o.data] = (byDay[o.data] || 0) + (o.rs_final || 0); });
  const dayVals = Object.values(byDay);
  const bestDay  = dayVals.length > 0 ? Math.max(...dayVals) : null;
  const worstDay = dayVals.length > 0 ? Math.min(...dayVals) : null;

  // Período legível
  const period = (() => {
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const now = new Date();
    return months[now.getMonth()] + ' ' + now.getFullYear();
  })();

  // Últimas ops para o feed (máx 6, decrescente)
  const recentOps = [...filtered].reverse().slice(0, 6);

  return (
    <>
      {/* ── RIGHT PANEL ─────────────────────────────── */}
      <aside className="right-panel">
        <div className="rp-header">
          <span className="rp-title">Resumo</span>
          <span className="rp-period">{period}</span>
        </div>

        {/* Performance */}
        <div className="rp-widget">
          <div className="rp-widget-title">Performance do período</div>
          <div className="rp-stats-grid">
            <div>
              <div className="rp-stat-label">Resultado</div>
              <div className="rp-stat-val" style={{ color: delta >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                {delta >= 0 ? '+' : ''}{fmtRS(delta)}
              </div>
            </div>
            <div>
              <div className="rp-stat-label">Operações</div>
              <div className="rp-stat-val">{filtered.length}</div>
            </div>
            <div>
              <div className="rp-stat-label">Melhor dia</div>
              <div className="rp-stat-val" style={{ color: 'var(--gain)' }}>
                {bestDay !== null ? `+${fmtRS(bestDay)}` : '—'}
              </div>
            </div>
            <div>
              <div className="rp-stat-label">Pior dia</div>
              <div className="rp-stat-val" style={{ color: worstDay !== null && worstDay < 0 ? 'var(--loss)' : undefined }}>
                {worstDay !== null ? fmtRS(worstDay) : '—'}
              </div>
            </div>
          </div>
          {stat.acerto !== null && (
            <div className="rp-bar-row">
              <div className="rp-bar-label">
                <span>Taxa de acerto</span>
                <span style={{ color: 'var(--gain)', fontWeight: 700 }}>{(stat.acerto * 100).toFixed(1)}%</span>
              </div>
              <div className="rp-bar">
                <div className="rp-bar-fill" style={{ width: `${stat.acerto * 100}%` }} />
              </div>
            </div>
          )}
          {stat.payoff !== null && (
            <div className="rp-bar-row">
              <div className="rp-bar-label">
                <span>Payoff</span>
                <span style={{ color: 'var(--gain)', fontWeight: 700 }}>{stat.payoff.toFixed(2)}x</span>
              </div>
              <div className="rp-bar">
                <div className="rp-bar-fill" style={{ width: `${Math.min(stat.payoff / 3 * 100, 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Distribuição */}
        <div className="rp-mini-chart">
          <div className="rp-widget-title">Distribuição G / L / PE</div>
          <div className="rp-mini-canvas">
            <Doughnut
              data={{
                labels: [`Gain (${stat.gains})`, `Loss (${stat.losses})`, `PE (${stat.pes})`],
                datasets: [{
                  data: [stat.gains, stat.losses, stat.pes],
                  backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(239,68,68,0.80)', 'rgba(245,158,11,0.80)'],
                  borderColor: 'var(--sidebar-bg)',
                  borderWidth: 3,
                  hoverOffset: 4,
                  pointStyle: 'circle' as const,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#666', font: { size: 11 }, padding: 10, usePointStyle: true, pointStyle: 'circle', pointStyleWidth: 8 },
                  },
                  tooltip: {
                    backgroundColor: '#1a1a1a',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    titleColor: '#888',
                    bodyColor: '#e2e2e2',
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Feed */}
        <div className="rp-feed-label">Atividade Recente</div>
        {recentOps.length === 0 && (
          <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Sem operações
          </div>
        )}
        {recentOps.map(o => {
          const dotClass = o.situacao === 'Gain' ? 'gain' : o.situacao === 'Loss' ? 'loss' : 'pe';
          const valColor = o.situacao === 'Gain' ? 'var(--gain)' : o.situacao === 'Loss' ? 'var(--loss)' : 'var(--pe-color)';
          const valText  = o.situacao === 'PE' ? 'PE'
            : o.rs_final != null ? `${o.rs_final >= 0 ? '+' : ''}${fmtRS(o.rs_final)}` : '—';
          const [, mm, dd] = o.data.split('-');
          return (
            <div key={o.id} className="rp-feed-item">
              <div className={`rp-feed-dot ${dotClass}`} />
              <div className="rp-feed-body">
                <div className="rp-feed-name">{o.ativo} · {o.tipo} · {o.setup || '—'}</div>
                <div className="rp-feed-meta">{dd}/{mm} · {o.pts_final != null ? `${o.pts_final > 0 ? '+' : ''}${o.pts_final} pts` : '—'}</div>
              </div>
              <div className="rp-feed-value" style={{ color: valColor }}>{valText}</div>
            </div>
          );
        })}
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────── */}
      <div className="dash-panel-offset">

        {/* Filtro de período */}
        <div className="dash-filter">
          <div className="dash-filter-group">
            <label>De</label>
            <input type="date" className="filter-input" value={de} onChange={e => setDe(e.target.value)} />
          </div>
          <div className="dash-filter-group">
            <label>Até</label>
            <input type="date" className="filter-input" value={ate} onChange={e => setAte(e.target.value)} />
          </div>
          {hasFilter && (
            <button className="btn btn-ghost" style={{ alignSelf: 'flex-end' }} onClick={() => { setDe(''); setAte(''); }}>
              <X size={12} strokeWidth={2} /> Limpar
            </button>
          )}
          <span className="dash-filter-count">
            {filtered.length} {filtered.length === 1 ? 'operação' : 'operações'}
            {hasFilter && ops.length !== filtered.length && ` de ${ops.length} total`}
          </span>
        </div>

        {/* KPI ROW */}
        <div className="dash-kpi-row">

          <div className="dash-kpi-card">
            <div className="dash-kpi-header">
              <DollarSign size={14} className="dash-kpi-icon" strokeWidth={1.75} />
              <span className="dash-kpi-label">Capital Atual</span>
            </div>
            <div className="dash-kpi-value">{fmtRS(capitalAtual)}</div>
            <div className="dash-kpi-delta">
              {delta !== 0 && (
                <span className={`dash-pill ${delta > 0 ? 'dash-pill-up' : 'dash-pill-down'}`}>
                  {delta > 0 ? '▲' : '▼'} {pctDelta > 0 ? '+' : ''}{pctDelta.toFixed(1)}%
                </span>
              )}
              <span>desde o início</span>
            </div>
          </div>

          <div className="dash-kpi-card">
            <div className="dash-kpi-header">
              <Activity size={14} className="dash-kpi-icon" strokeWidth={1.75} />
              <span className="dash-kpi-label">Operações</span>
            </div>
            <div className="dash-kpi-value">{filtered.length}</div>
            <div className="dash-kpi-delta">
              {filtered.length > 0
                ? `${stat.gains}G · ${stat.losses}L${stat.pes > 0 ? ` · ${stat.pes}PE` : ''} · este período`
                : 'nenhuma operação'}
            </div>
          </div>

          <div className="dash-kpi-card">
            <div className="dash-kpi-header">
              <Target size={14} className="dash-kpi-icon" strokeWidth={1.75} />
              <span className="dash-kpi-label">Taxa de Acerto</span>
            </div>
            <div className="dash-kpi-value" style={{ color: stat.acerto != null ? (stat.acerto >= 0.5 ? 'var(--gain)' : 'var(--loss)') : undefined }}>
              {stat.acerto !== null ? `${(stat.acerto * 100).toFixed(1)}%` : '—'}
            </div>
            <div className="dash-kpi-delta">
              {stat.payoff !== null && (
                <>
                  <span className={`dash-pill ${stat.payoff >= 1 ? 'dash-pill-up' : 'dash-pill-down'}`}>
                    {stat.payoff.toFixed(2)}x
                  </span>
                  <span>payoff</span>
                </>
              )}
            </div>
          </div>

          <div className="dash-kpi-card">
            <div className="dash-kpi-header">
              <Clock size={14} className="dash-kpi-icon" strokeWidth={1.75} />
              <span className="dash-kpi-label">Resultado Hoje</span>
            </div>
            <div className="dash-kpi-value" style={{ color: todayRS > 0 ? 'var(--gain)' : todayRS < 0 ? 'var(--loss)' : undefined }}>
              {todayOps.length > 0 ? `${todayRS >= 0 ? '+' : ''}${fmtRS(todayRS)}` : '—'}
            </div>
            <div className="dash-kpi-delta">
              {todayOps.length > 0
                ? `${todayOps.length} ${todayOps.length === 1 ? 'operação' : 'operações'}${todayAcerto !== null ? ` · ${Math.round(todayAcerto * 100)}% acerto` : ''}`
                : 'sem operações hoje'}
            </div>
          </div>

        </div>

        {/* CURVA DE CAPITAL */}
        <div className="dash-chart-card">
          <div className="dash-chart-header">
            <div className="dash-chart-meta">
              <div className="dash-chart-title">Curva de Capital</div>
              <div className="dash-chart-sub">Evolução do patrimônio no período</div>
              <div className="dash-chart-value">
                <span className="dash-chart-value-num">{fmtRS(capitalAtual)}</span>
                {delta !== 0 && (
                  <span className="dash-chart-value-delta" style={{ color: delta > 0 ? 'var(--gain)' : 'var(--loss)' }}>
                    {delta > 0 ? '+' : ''}{pctDelta.toFixed(1)}% desde o início
                  </span>
                )}
              </div>
            </div>
            <button className="period-btn">Este período ▾</button>
          </div>
          <div className="dash-chart-body">
            <CapitalChart ops={filtered} capitalInicial={capitalInicial} />
          </div>
        </div>

        {/* TABELA */}
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">Últimas Operações</span>
            <Link href="/historico" className="btn-link">Ver histórico completo →</Link>
          </div>
          <OperacoesTable ops={[...filtered].reverse()} limit={8} />
        </div>

      </div>
    </>
  );
}
