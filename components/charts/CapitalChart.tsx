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

export type ChartMode = 'operacao' | 'dia' | 'semana' | 'mes';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chart.data.datasets[0] as any).backgroundColor = gradient;
  },
};

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function buildData(ops: Operacao[], capitalInicial: number, mode: ChartMode) {
  if (mode === 'operacao') {
    const sorted = [...ops].sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      return (a.created_at ?? '').localeCompare(b.created_at ?? '');
    });
    let acc = capitalInicial;
    const curve  = [capitalInicial];
    const labels = ['Início'];
    sorted.forEach((op, i) => {
      acc += op.rs_final || 0;
      curve.push(acc);
      const sign = (op.pts_final ?? 0) > 0 ? '+' : '';
      labels.push(`#${i + 1} ${op.ativo} ${sign}${op.pts_final ?? '—'} pts`);
    });
    return { curve, labels, pointCount: sorted.length };
  }

  type KeyFn   = (d: string) => string;
  type LabelFn = (k: string) => string;

  let keyFn:   KeyFn;
  let labelFn: LabelFn;

  if (mode === 'dia') {
    keyFn   = d => d;
    labelFn = d => formatDate(d);
  } else if (mode === 'semana') {
    keyFn   = d => isoWeekKey(d);
    labelFn = k => `Sem ${parseInt(k.split('-W')[1])}`;
  } else {
    keyFn   = d => d.slice(0, 7);
    labelFn = k => {
      const [year, month] = k.split('-');
      return `${MONTHS[parseInt(month) - 1]}/${year.slice(2)}`;
    };
  }

  const agg: Record<string, number> = {};
  ops.forEach(o => {
    const k = keyFn(o.data);
    agg[k] = (agg[k] || 0) + (o.rs_final || 0);
  });

  const sorted = Object.keys(agg).sort();
  let acc = capitalInicial;
  const curve  = [capitalInicial, ...sorted.map(k => { acc += agg[k]; return acc; })];
  const labels = ['Início', ...sorted.map(labelFn)];
  return { curve, labels, pointCount: sorted.length };
}

export default function CapitalChart({
  ops,
  capitalInicial,
  mode = 'dia',
}: {
  ops: Operacao[];
  capitalInicial: number;
  mode?: ChartMode;
}) {
  const { curve, labels, pointCount } = buildData(ops, capitalInicial, mode);

  if (pointCount === 0) {
    return <div className="chart-empty visible">Sem operações registradas ainda</div>;
  }

  const isDark    = document.documentElement.getAttribute('data-theme') !== 'light';
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
      tension: mode === 'operacao' ? 0.3 : 0.45,
      pointBackgroundColor: GREEN,
      pointBorderColor: isDark ? '#141414' : '#ffffff',
      pointBorderWidth: 2,
      pointRadius: pointCount > 60 ? 0 : mode === 'operacao' ? 3 : 4,
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
        ticks: { color: textColor, font: { size: 12 }, maxTicksLimit: mode === 'operacao' ? 10 : 8 },
        grid: { color: gridColor },
        border: { display: false },
      },
      y: {
        ticks: {
          color: textColor,
          font: { size: 12 },
          callback: (v) => {
            const n = Number(v);
            if (n >= 1000 || n <= -1000) return `R$${(n / 1000).toFixed(0)}k`;
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
