import { createClient } from '@/utils/supabase/server';
import { calcEstatisticas } from '@/lib/calculations';

export const dynamic = 'force-dynamic';
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
  const stat      = calcEstatisticas(operacoes, capital);
  const capitalAtual = capital + stat.rsTotal;
  const delta        = capitalAtual - capital;

  const ddColor = stat.drawdown == null ? undefined
    : stat.drawdown > 0.20 ? 'var(--loss)'
    : stat.drawdown > 0.10 ? 'var(--pe-color)'
    : 'var(--gain)';

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
          <div className="kpi-delta">
            {stat.total > 0 ? `${stat.gains} G · ${stat.losses} L${stat.pes > 0 ? ` · ${stat.pes} PE` : ''}` : 'Total realizadas'}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Taxa de Acerto</div>
          <div className="kpi-value" style={{ color: stat.acerto != null ? (stat.acerto >= 0.5 ? 'var(--gain)' : 'var(--loss)') : undefined }}>
            {stat.acerto !== null ? (stat.acerto * 100).toFixed(1) + '%' : '—'}
          </div>
          <div className="kpi-delta">{stat.mediaGain ? 'Média G: ' + fmtRS(stat.mediaGain) : ''}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Payoff</div>
          <div className="kpi-value" style={{ color: stat.payoff != null ? (stat.payoff >= 1 ? 'var(--gain)' : 'var(--loss)') : undefined }}>
            {stat.payoff !== null ? stat.payoff.toFixed(2) + 'x' : '—'}
          </div>
          <div className="kpi-delta">{stat.mediaLoss ? 'Média L: ' + fmtRS(stat.mediaLoss) : ''}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Expect. Matemática</div>
          <div className="kpi-value" style={{ color: stat.expectativa != null ? (stat.expectativa > 0 ? 'var(--gain)' : 'var(--loss)') : undefined }}>
            {stat.expectativa !== null ? fmtRS(stat.expectativa) : '—'}
          </div>
          <div className="kpi-delta">por operação (média)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Drawdown Máx.</div>
          <div className="kpi-value" style={{ color: ddColor }}>
            {stat.drawdown !== null ? fmtPct(stat.drawdown) : '—'}
          </div>
          <div className="kpi-delta">
            {stat.drawdown != null ? (stat.drawdown > 0.20 ? 'Alto — revisar risco' : stat.drawdown > 0.10 ? 'Moderado' : 'Controlado') : 'sem operações'}
          </div>
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
