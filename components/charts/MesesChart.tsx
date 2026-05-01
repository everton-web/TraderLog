'use client';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import type { Operacao } from '@/lib/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function MesesChart({ ops }: { ops: Operacao[] }) {
  const mesesMap: Record<string, number> = {};
  ops.forEach(o => {
    const [y, m] = o.data.split('-');
    const key = `${y}-${m}`;
    mesesMap[key] = (mesesMap[key] || 0) + (o.rs_final || 0);
  });
  const sorted = Object.keys(mesesMap).sort();

  if (sorted.length === 0) {
    return <div className="chart-empty visible">Sem operações registradas ainda</div>;
  }

  const values = sorted.map(k => mesesMap[k]);
  const labels = sorted.map(k => {
    const [y, m] = k.split('-');
    return `${MESES[parseInt(m) - 1]}/${y.slice(2)}`;
  });

  const isDark    = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? '#555' : '#9ca3af';

  return (
    <Bar
      data={{
        labels,
        datasets: [{
          label: 'Resultado',
          data: values,
          backgroundColor: values.map(v => v >= 0 ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)'),
          borderColor:      values.map(v => v >= 0 ? '#10b981' : '#ef4444'),
          borderWidth: 1,
          borderRadius: 3,
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
