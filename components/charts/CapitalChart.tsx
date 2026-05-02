'use client';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import type { Operacao } from '@/lib/types';
import { formatDate } from '@/lib/formatters';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const GREEN      = '#10b981';
const GREEN_GLOW = 'rgba(16,185,129,0.45)';
const GREEN_ZERO = 'rgba(16,185,129,0)';

function makeGradient(ctx: CanvasRenderingContext2D, top: number, bottom: number) {
  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  gradient.addColorStop(0, GREEN_GLOW);
  gradient.addColorStop(1, GREEN_ZERO);
  return gradient;
}

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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Line
        data={{
          labels,
          datasets: [{
            label: 'Capital',
            data: curve,
            borderColor: GREEN,
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return GREEN_ZERO;
              return makeGradient(ctx, chartArea.top, chartArea.bottom);
            },
            fill: true,
            tension: 0.45,
            pointBackgroundColor: GREEN,
            pointBorderColor: '#141414',
            pointBorderWidth: 2,
            pointRadius: sorted.length > 60 ? 0 : 4,
            pointHoverRadius: 6,
            borderWidth: 2.5,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1a1a',
              borderColor: 'rgba(16,185,129,0.3)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#e2e2e2',
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
                callback: v => `R$${Number(v).toLocaleString('pt-BR', { notation: 'compact' })}`,
              },
              grid: { color: gridColor },
              border: { display: false },
            },
          },
        }}
      />
    </div>
  );
}
