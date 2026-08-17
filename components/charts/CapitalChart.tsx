'use client';
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
const RED        = '#ef4444';
const ORANGE     = '#f59e0b';

const dualColorPlugin: Plugin<'line'> = {
  id: 'capitalDualColor',
  beforeDatasetDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;

    const yScale = scales['y'];
    const zeroY = yScale.getPixelForValue(0);
    const clampedZero = Math.max(chartArea.top, Math.min(chartArea.bottom, zeroY));

    const greenGrad = ctx.createLinearGradient(0, chartArea.top, 0, clampedZero);
    greenGrad.addColorStop(0, 'rgba(16,185,129,0.35)');
    greenGrad.addColorStop(1, 'rgba(16,185,129,0.03)');

    const redGrad = ctx.createLinearGradient(0, clampedZero, 0, chartArea.bottom);
    redGrad.addColorStop(0, 'rgba(239,68,68,0.03)');
    redGrad.addColorStop(1, 'rgba(239,68,68,0.35)');

    const ds = chart.data.datasets[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = chart.getDatasetMeta(0) as any;
    const data = ds.data as number[];

    const allAbove = data.every(v => v >= 0);
    const allBelow = data.every(v => v <= 0);

    if (allAbove) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ds as any).backgroundColor = greenGrad;
    } else if (allBelow) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ds as any).backgroundColor = redGrad;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ds as any).backgroundColor = (context: any) => {
        const { raw } = context;
        return raw >= 0 ? greenGrad : redGrad;
      };
    }

    const points = meta.data;
    if (!points || points.length < 2) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ds as any).segment = {
      borderColor: (ctx: { p0: { parsed: { y: number } }; p1: { parsed: { y: number } } }) => {
        const avg = (ctx.p0.parsed.y + ctx.p1.parsed.y) / 2;
        if (avg > 0) return GREEN;
        if (avg < 0) return RED;
        return ORANGE;
      },
    };
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

  const relCurve = curve.map(v => v - capitalInicial);

  const data: ChartData<'line'> = {
    labels,
    datasets: [{
      label: 'Resultado',
      data: relCurve,
      borderColor: GREEN,
      backgroundColor: 'transparent',
      fill: true,
      tension: mode === 'operacao' ? 0.15 : 0.2,
      pointBackgroundColor: relCurve.map(v => v > 0 ? GREEN : v < 0 ? RED : ORANGE),
      pointBorderColor: isDark ? '#141414' : '#ffffff',
      pointBorderWidth: 2,
      pointRadius: pointCount > 60 ? 0 : mode === 'operacao' ? 3 : 4,
      pointHoverRadius: 6,
      borderWidth: 2.5,
      segment: {
        borderColor: (ctx) => {
          const y0 = ctx.p0.parsed.y ?? 0;
          const y1 = ctx.p1.parsed.y ?? 0;
          const avg = (y0 + y1) / 2;
          if (avg > 0) return GREEN;
          if (avg < 0) return RED;
          return ORANGE;
        },
      },
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
          label: (item) => {
            const val = Number(item.raw);
            const abs = Math.abs(val);
            const sign = val >= 0 ? '+' : '-';
            return ` ${sign} R$ ${abs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          },
          afterLabel: (item) => {
            const capital = curve[item.dataIndex];
            return `  Capital: R$ ${capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          },
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
            if (n >= 1000 || n <= -1000) return `R$${(n / 1000).toFixed(1)}k`;
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
      <Line data={data} options={options} plugins={[dualColorPlugin]} />
    </div>
  );
}
