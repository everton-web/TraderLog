'use client';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { Operacao } from '@/lib/types';

ChartJS.register(ArcElement, Tooltip, Legend);

const ITEMS = [
  { key: 'Gain' as const, color: '#10b981', bg: 'rgba(16,185,129,0.75)' },
  { key: 'Loss' as const, color: '#ef4444', bg: 'rgba(239,68,68,0.75)' },
  { key: 'PE'   as const, color: '#f59e0b', bg: 'rgba(245,158,11,0.75)' },
];

export default function DistribuicaoChart({ ops }: { ops: Operacao[] }) {
  const counts = {
    Gain: ops.filter(o => o.situacao === 'Gain').length,
    Loss: ops.filter(o => o.situacao === 'Loss').length,
    PE:   ops.filter(o => o.situacao === 'PE').length,
  };
  const total = counts.Gain + counts.Loss + counts.PE;

  if (total === 0) {
    return <div className="chart-empty visible">Sem operações registradas ainda</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <Doughnut
          data={{
            labels: ITEMS.map(i => i.key),
            datasets: [{
              data: ITEMS.map(i => counts[i.key]),
              backgroundColor: ITEMS.map(i => i.bg),
              borderColor: ITEMS.map(i => i.color),
              borderWidth: 1,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
              legend: { display: false },
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
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', paddingTop: '8px', flexShrink: 0 }}>
        {ITEMS.map(({ key, color }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ color: '#888', fontSize: '11px' }}>{key} ({counts[key]})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
