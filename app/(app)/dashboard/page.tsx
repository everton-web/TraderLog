import { createClient } from '@/utils/supabase/server';
import { calcEstatisticas } from '@/lib/calculations';
import { fmtRS, fmtPct } from '@/lib/formatters';
import OperacoesTable from '@/components/OperacoesTable';
import DashboardCharts from '@/components/charts/DashboardCharts';
import Link from 'next/link';
import type { Operacao, Configuracao } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: ops }, { data: cfg }] = await Promise.all([
    supabase.from('operacoes').select('*').eq('user_id', user!.id).order('data', { ascending: true }),
    supabase.from('configuracoes').select('*').eq('user_id', user!.id).single(),
  ]);

  const operacoes = (ops || []) as Operacao[];
  const config    = cfg as Configuracao | null;
  const capital   = config?.capital ?? 2000;
  const stat      = calcEstatisticas(operacoes);
  const capitalAtual = capital + stat.rsTotal;
  const delta        = capitalAtual - capital;

  return (
    <>
      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Capital Atual</div>
          <div className="kpi-value">{fmtRS(capitalAtual)}</div>
          <div className="kpi-delta" style={{ color: delta > 0 ? 'var(--gain)' : delta < 0 ? 'var(--loss)' : undefined }}>
            {delta !== 0 ? (delta > 0 ? '▲ +' : '▼ ') + fmtRS(delta) : 'Capital inicial: ' + fmtRS(capital)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Operações</div>
          <div className="kpi-value">{stat.total}</div>
          <div className="kpi-delta">Total realizadas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Taxa de Acerto</div>
          <div className="kpi-value">{stat.acerto !== null ? (stat.acerto * 100).toFixed(1) + '%' : '—'}</div>
          <div className="kpi-delta">
            {stat.total > 0 ? `${stat.gains} G / ${stat.losses} L${stat.pes > 0 ? ` / ${stat.pes} PE` : ''}` : ''}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Payoff Médio</div>
          <div className="kpi-value">{stat.payoff !== null ? stat.payoff.toFixed(2) + 'x' : '—'}</div>
          <div className="kpi-delta">{stat.mediaGain ? 'Média G: ' + fmtRS(stat.mediaGain) : ''}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Gains</div>
          <div className="kpi-value gain-text">{stat.gains}</div>
          <div className="kpi-delta">{stat.mediaGain ? 'Média: ' + fmtRS(stat.mediaGain) : ''}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Losses</div>
          <div className="kpi-value loss-text">{stat.losses}</div>
          <div className="kpi-delta">{stat.mediaLoss ? 'Média: ' + fmtRS(stat.mediaLoss) : ''}</div>
        </div>
      </div>

      {/* Charts */}
      <DashboardCharts ops={operacoes} capitalInicial={capital} />

      {/* Recent ops */}
      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">Últimas Operações</span>
          <Link href="/historico" className="btn-link">Ver todas →</Link>
        </div>
        <OperacoesTable ops={[...operacoes].reverse()} limit={10} />
      </div>
    </>
  );
}
