'use client';
import { useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend,
  type ChartData, type ChartOptions, type Plugin,
} from 'chart.js';
import type { Operacao } from '@/lib/types';
import { formatDate } from '@/lib/formatters';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const GREEN      = '#10b981';
const GREEN_GLOW = 'rgba(16,185,129,0.40)';
const GREEN_ZERO = 'rgba(16,185,129,0.00)';

const gradientPlugin: Plugin<'line'> = {
  id: 'capitalGradient',
  beforeDatasetDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, GREEN_GLOW);
    gradient.addColorStop(1, GREEN_ZERO);
    (chart.data.datasets[0] as any).backgroundColor = gradient;
  },
};

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
  const textColor = isDark ? '#666' : '#9ca3af';

  const data: ChartData<'line'> = {
    labels,
    datasets: [{
      label: 'Capital',
      data: curve,
      borderColor: GREEN,
      backgroundColor: GREEN_ZERO,
      fill: true,
      tension: 0.45,
      pointBackgroundColor: GREEN,
      pointBorderColor: isDark ? '#141414' : '#ffffff',
      pointBorderWidth: 2,
      pointRadius: sorted.length > 60 ? 0 : 4,
      pointHoverRadius: 6,
      borderWidth: 2.5,
    }],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        borderColor: 'rgba(16,185,129,0.3)',
        borderWidth: 1,
        titleColor: textColor,
        bodyColor: isDark ? '#e2e2e2' : '#111827',
        padding: 10,
        callbacks: {
          label: (item) => ` R$ ${Number(item.raw).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: textColor, font: { size: 12 }, maxTicksLimit: 8 },
        grid: { color: gridColor },
        border: { display: false },
      },
      y: {
        ticks: {
          color: textColor,
          font: { size: 12 },
          callback: (v) => {
            const n = Number(v);
            if (n >= 1000) return `R$${(n / 1000).toFixed(0)}k`;
            return `R$${n.toFixed(0)}`;
          },
        },
        grid: { color: gridColor },
        border: { display: false },
      },
    },
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Line data={data} options={options} plugins={[gradientPlugin]} />
    </div>
  );
}
