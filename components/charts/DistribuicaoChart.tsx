'use client';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { Operacao } from '@/lib/types';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DistribuicaoChart({ ops }: { ops: Operacao[] }) {
  const gains  = ops.filter(o => o.situacao === 'Gain').length;
  const losses = ops.filter(o => o.situacao === 'Loss').length;
  const pes    = ops.filter(o => o.situacao === 'PE').length;
  const total  = gains + losses + pes;

  if (total === 0) {
    return <div className="chart-empty visible">Sem operações registradas ainda</div>;
  }

  const isDark    = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? '#888' : '#4b5563';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Doughnut
        data={{
          labels: ['Gain', 'Loss', 'PE'],
          datasets: [{
            data: [gains, losses, pes],
            backgroundColor: ['rgba(16,185,129,0.75)', 'rgba(239,68,68,0.75)', 'rgba(245,158,11,0.75)'],
            borderColor:     ['#10b981', '#ef4444', '#f59e0b'],
            borderWidth: 1,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, font: { size: 11 }, padding: 10, boxWidth: 10 },
            },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const pct = ((ctx.parsed / total) * 100).toFixed(1);
                  return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                },
              },
            },
          },
        }}
      />
    </div>
  );
}
