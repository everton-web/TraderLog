'use client';
import dynamic from 'next/dynamic';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { calcEstatisticas } from '@/lib/calculations';
import { fmtRS, fmtPct } from '@/lib/formatters';
import OperacoesTable from '@/components/OperacoesTable';
import type { Operacao } from '@/lib/types';

const CapitalChart      = dynamic(() => import('@/components/charts/CapitalChart'),      { ssr: false });
const DiasChart         = dynamic(() => import('@/components/charts/DiasChart'),         { ssr: false });
const MesesChart        = dynamic(() => import('@/components/charts/MesesChart'),        { ssr: false });
const DistribuicaoChart = dynamic(() => import('@/components/charts/DistribuicaoChart'), { ssr: false });

export default function DashboardClient({ ops, capitalInicial }: { ops: Operacao[]; capitalInicial: number }) {
  const [de, setDe]   = useState('');
  const [ate, setAte] = useState('');

  const filtered = useMemo(() => ops.filter(o => {
    if (de  && o.data < de)  return false;
    if (ate && o.data > ate) return false;
    return true;
  }), [ops, de, ate]);

  const stat        = useMemo(() => calcEstatisticas(filtered, capitalInicial), [filtered, capitalInicial]);
  const capitalAtual = capitalInicial + stat.rsTotal;
  const delta        = capitalAtual - capitalInicial;
  const hasFilter    = !!(de || ate);

  const ddColor = stat.drawdown == null ? undefined
    : stat.drawdown > 0.20 ? 'var(--loss)'
    : stat.drawdown > 0.10 ? 'var(--pe-color)'
    : 'var(--gain)';

  return (
    <>
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

      {/* Bento Grid */}
      <div className="bento-grid">

        {/* ── KPI linha 1 ── */}
        <div className="bento-card bento-capital">
          <div className="bento-label">Capital Atual</div>
          <div className="bento-value">{fmtRS(capitalAtual)}</div>
          <div className="bento-delta" style={{ color: delta > 0 ? 'var(--gain)' : delta < 0 ? 'var(--loss)' : undefined }}>
            {delta > 0 ? '▲ +' + fmtRS(delta) : delta < 0 ? '▼ ' + fmtRS(delta) : 'Capital inicial: ' + fmtRS(capitalInicial)}
          </div>
        </div>

        <div className="bento-card bento-ops">
          <div className="bento-label">Operações</div>
          <div className="bento-value bento-value--md">{filtered.length}</div>
          <div className="bento-delta">
            {filtered.length > 0 ? `${stat.gains} G · ${stat.losses} L${stat.pes > 0 ? ` · ${stat.pes} PE` : ''}` : 'nenhuma'}
          </div>
        </div>

        <div className="bento-card bento-acerto">
          <div className="bento-label">Taxa de Acerto</div>
          <div className="bento-value bento-value--md" style={{ color: stat.acerto != null ? (stat.acerto >= 0.5 ? 'var(--gain)' : 'var(--loss)') : undefined }}>
            {stat.acerto !== null ? (stat.acerto * 100).toFixed(1) + '%' : '—'}
          </div>
          <div className="bento-delta">{stat.mediaGain ? 'Média G: ' + fmtRS(stat.mediaGain) : ''}</div>
        </div>

        {/* ── KPI linha 2 ── */}
        <div className="bento-card bento-payoff">
          <div className="bento-label">Payoff</div>
          <div className="bento-value bento-value--md" style={{ color: stat.payoff != null ? (stat.payoff >= 1 ? 'var(--gain)' : 'var(--loss)') : undefined }}>
            {stat.payoff !== null ? stat.payoff.toFixed(2) + 'x' : '—'}
          </div>
          <div className="bento-delta">{stat.mediaLoss ? 'Média L: ' + fmtRS(stat.mediaLoss) : ''}</div>
        </div>

        <div className="bento-card bento-expect">
          <div className="bento-label">Expect. Matemática</div>
          <div className="bento-value bento-value--md" style={{ color: stat.expectativa != null ? (stat.expectativa > 0 ? 'var(--gain)' : 'var(--loss)') : undefined }}>
            {stat.expectativa !== null ? fmtRS(stat.expectativa) : '—'}
          </div>
          <div className="bento-delta">por operação</div>
        </div>

        <div className="bento-card bento-dd">
          <div className="bento-label">Drawdown Máx.</div>
          <div className="bento-value bento-value--md" style={{ color: ddColor }}>
            {stat.drawdown !== null ? fmtPct(stat.drawdown) : '—'}
          </div>
          <div className="bento-delta">
            {stat.drawdown != null ? (stat.drawdown > 0.20 ? 'Alto — revisar risco' : stat.drawdown > 0.10 ? 'Moderado' : 'Controlado') : 'sem dados'}
          </div>
        </div>

        {/* ── Gráficos linha 1 ── */}
        <div className="bento-card bento-curva">
          <div className="bento-chart-title">Curva de Capital</div>
          <div className="bento-chart-body">
            <CapitalChart ops={filtered} capitalInicial={capitalInicial} />
          </div>
        </div>

        <div className="bento-card bento-distrib">
          <div className="bento-chart-title">Distribuição G / L / PE</div>
          <div className="bento-chart-body">
            <DistribuicaoChart ops={filtered} />
          </div>
        </div>

        {/* ── Gráficos linha 2 ── */}
        <div className="bento-card bento-meses">
          <div className="bento-chart-title">Resultado por Mês</div>
          <div className="bento-chart-body">
            <MesesChart ops={filtered} />
          </div>
        </div>

        <div className="bento-card bento-dias">
          <div className="bento-chart-title">Resultado por Dia</div>
          <div className="bento-chart-body">
            <DiasChart ops={filtered} />
          </div>
        </div>

        {/* ── Tabela ── */}
        <div className="bento-card bento-tabela">
          <div className="bento-table-header">
            <span className="bento-chart-title" style={{ margin: 0 }}>Últimas Operações</span>
            <Link href="/historico" className="btn-link">Ver todas →</Link>
          </div>
          <OperacoesTable ops={[...filtered].reverse()} limit={10} />
        </div>

      </div>
    </>
  );
}
