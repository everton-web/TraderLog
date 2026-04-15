'use client';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import type { Operacao } from '@/lib/types';
import { formatDate } from '@/lib/formatters';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function CapitalChart({ ops, capitalInicial }: { ops: Operacao[]; capitalInicial: number }) {
  const diasMap: Record<string, number> = {};
  ops.forEach(o => { diasMap[o.data] = (diasMap[o.data] || 0) + (o.rs_final || 0); });
  const sorted = Object.keys(diasMap).sort();

  if (sorted.length === 0) {
    return <div className="chart-empty visible">Sem operações registradas ainda</div>;
  }

  let acc = capitalInicial;
  const curve = [capitalInicial, ...sorted.map(d => { acc += diasMap[d]; return acc; })];
  const labels = ['Inicial', ...sorted.map(formatDate)];

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? '#555' : '#9ca3af';

  return (
    <Line
      data={{
        labels,
        datasets: [{
          label: 'Capital',
          data: curve,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 4,
          borderWidth: 2,
        }],
      }}
      options={{
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, font: { size: 10 }, callback: v => `R$${Number(v).toLocaleString('pt-BR')}` }, grid: { color: gridColor } },
        },
      }}
    />
  );
}
