'use client';
import dynamic from 'next/dynamic';
import type { Operacao } from '@/lib/types';

const CapitalChart = dynamic(() => import('./CapitalChart'), { ssr: false });
const DiasChart    = dynamic(() => import('./DiasChart'),    { ssr: false });

export default function DashboardCharts({ ops, capitalInicial }: { ops: Operacao[]; capitalInicial: number }) {
  return (
    <div className="charts-grid">
      <div className="chart-card">
        <div className="chart-title">Curva de Capital (R$)</div>
        <CapitalChart ops={ops} capitalInicial={capitalInicial} />
      </div>
      <div className="chart-card">
        <div className="chart-title">Resultado por Dia (R$)</div>
        <DiasChart ops={ops} />
      </div>
    </div>
  );
}
