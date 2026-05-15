import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js';
import { useEffect, useRef, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
);

const PALETTE = [
  { line: '#6ee7f7', fill: 'rgba(110,231,247,0.15)', glow: '#6ee7f7' },
  { line: '#a78bfa', fill: 'rgba(167,139,250,0.15)', glow: '#a78bfa' },
  { line: '#34d399', fill: 'rgba(52,211,153,0.15)', glow: '#34d399' },
  { line: '#fb923c', fill: 'rgba(251,146,60,0.15)', glow: '#fb923c' },
  { line: '#f472b6', fill: 'rgba(244,114,182,0.15)', glow: '#f472b6' },
  { line: '#facc15', fill: 'rgba(250,204,21,0.15)', glow: '#facc15' },
  { line: '#60a5fa', fill: 'rgba(96,165,250,0.15)', glow: '#60a5fa' },
];

const AREA_COLORS = [
  { bg: 'rgba(110,231,247,0.75)', border: '#6ee7f7' },
  { bg: 'rgba(167,139,250,0.75)', border: '#a78bfa' },
  { bg: 'rgba(52,211,153,0.75)', border: '#34d399' },
  { bg: 'rgba(251,146,60,0.75)', border: '#fb923c' },
  { bg: 'rgba(244,114,182,0.75)', border: '#f472b6' },
  { bg: 'rgba(250,204,21,0.75)', border: '#facc15' },
  { bg: 'rgba(96,165,250,0.75)', border: '#60a5fa' },
];

const LABEL_MAP: Record<string, string> = {
  language: 'Linguagem', motor: 'Motor', cognitive: 'Cognitivo',
  behavior: 'Comportamento', social: 'Social',
  linguagem_expressiva: 'Ling. Expressiva', linguagem_receptiva: 'Ling. Receptiva',
  pragmatica: 'Pragmática', voz: 'Voz', motricidade_orofacial: 'Motricidade Orofacial',
  emocional: 'Emocional', autonomia: 'Autonomia', sensorial: 'Sensorial',
  atencao: 'Atenção', memoria: 'Memória', comunicacao: 'Comunicação',
};

const darkGrid = 'rgba(255,255,255,0.06)';
const darkTick = '#9ca3af';

const baseScales = {
  x: {
    grid: { color: darkGrid, drawBorder: false },
    ticks: { color: darkTick, maxRotation: 40, minRotation: 40, font: { size: 11 } },
    border: { color: darkGrid }
  },
  y: {
    beginAtZero: true,
    grid: { color: darkGrid, drawBorder: false },
    ticks: { color: darkTick, stepSize: 1, font: { size: 11 } },
    border: { color: darkGrid }
  }
};

const baseTooltip = {
  backgroundColor: 'rgba(15,15,30,0.95)',
  titleColor: '#e2e8f0',
  bodyColor: '#94a3b8',
  borderColor: 'rgba(255,255,255,0.1)',
  borderWidth: 1,
  padding: 14,
  cornerRadius: 10,
  displayColors: true,
  usePointStyle: true
};

const EvolutionChart = ({ chartData }: { chartData: any }) => {
  const [chartKey, setChartKey] = useState(0);
  const lineRef = useRef(null);

  useEffect(() => { setChartKey(prev => prev + 1); }, [chartData]);

  if (!chartData?.dates?.length || (!chartData.metrics && !chartData.evaluationTypes)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-gray-400 font-medium">Dados insuficientes para visualização</p>
        <p className="text-gray-600 text-sm mt-1">Adicione mais avaliações para gerar gráficos</p>
      </div>
    );
  }

  const formattedDates = chartData.dates.map((d: string) => {
    try { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); }
    catch { return d; }
  });

  const metricEntries = Object.entries(chartData.metrics || {});
  const metricDatasets = metricEntries.map(([name, data]: [string, any], i) => {
    const p = PALETTE[i % PALETTE.length];
    return {
      label: data.config?.description || name,
      data: data.values,
      borderColor: p.line,
      backgroundColor: p.fill,
      pointBackgroundColor: p.line,
      pointBorderColor: '#0f172a',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 8,
      borderWidth: 2.5,
      tension: 0.45,
      fill: true,
      spanGaps: true,
    };
  });

  const areaEntries = Object.entries(chartData.evaluationTypes || {});
  const evaluationDatasets = areaEntries.map(([type, data]: [string, any], i) => {
    const c = AREA_COLORS[i % AREA_COLORS.length];
    return {
      label: LABEL_MAP[type] || type,
      data: Array.isArray(data) ? data : data?.values,
      backgroundColor: c.bg,
      borderColor: c.border,
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
      barPercentage: 0.65,
      categoryPercentage: 0.7,
    };
  });

  const lineOptions: any = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#cbd5e1', boxWidth: 10, padding: 18, usePointStyle: true, pointStyle: 'circle', font: { size: 12 } }
      },
      tooltip: { ...baseTooltip }
    },
    scales: {
      ...baseScales,
      y: {
        ...baseScales.y,
        suggestedMax: (() => {
          let max = 0;
          Object.values(chartData.metrics || {}).forEach((m: any) => {
            m?.values?.forEach((v: number | null) => { if (v != null && v > max) max = v; });
          });
          return max > 0 ? Math.ceil(max * 1.25) : 10;
        })()
      }
    },
    animation: { duration: 900, easing: 'easeOutQuart' }
  };

  const barOptions: any = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#cbd5e1', boxWidth: 10, padding: 18, usePointStyle: true, pointStyle: 'rectRounded', font: { size: 12 } }
      },
      tooltip: { ...baseTooltip }
    },
    scales: baseScales,
    animation: { duration: 900, easing: 'easeOutQuart' }
  };

  return (
    <div className="space-y-6" key={chartKey}>

      {/* ── Métricas ── */}
      {metricDatasets.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 flex items-center gap-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-lg" style={{ boxShadow: '0 0 8px #6ee7f7' }} />
            <span className="font-semibold text-slate-200 text-base">Evolução das Métricas</span>
            <span className="ml-auto text-xs text-slate-500">{metricDatasets.length} métrica{metricDatasets.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-5">
            <div style={{ height: 280 }}>
              <Line ref={lineRef} data={{ labels: formattedDates, datasets: metricDatasets }} options={lineOptions} />
            </div>
          </div>
          {/* Cards de valor atual */}
          <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {metricEntries.map(([name, data]: [string, any], i) => {
              const p = PALETTE[i % PALETTE.length];
              const vals = data.values?.filter((v: any) => v != null);
              const last = vals?.length ? vals[vals.length - 1] : null;
              const first = vals?.length ? vals[0] : null;
              const delta = last !== null && first !== null ? last - first : null;
              return (
                <div key={name} className="rounded-xl p-3 flex flex-col gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${p.line}30` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.line, boxShadow: `0 0 6px ${p.line}` }} />
                    <span className="text-xs text-slate-400 truncate">{data.config?.description || name}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold" style={{ color: p.line }}>{last ?? '—'}</span>
                    {delta !== null && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${delta > 0 ? 'text-emerald-400 bg-emerald-400/10' : delta < 0 ? 'text-red-400 bg-red-400/10' : 'text-slate-400 bg-slate-400/10'}`}>
                        {delta > 0 ? `+${delta.toFixed(1)}` : delta < 0 ? delta.toFixed(1) : '—'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Áreas ── */}
      {evaluationDatasets.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #0f172a 0%, #064e3b20 100%)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 flex items-center gap-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg" style={{ boxShadow: '0 0 8px #34d399' }} />
            <span className="font-semibold text-slate-200 text-base">Distribuição de Áreas</span>
            <span className="ml-auto text-xs text-slate-500">{evaluationDatasets.length} área{evaluationDatasets.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-5">
            <div style={{ height: 260 }}>
              <Bar data={{ labels: formattedDates, datasets: evaluationDatasets }} options={barOptions} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EvolutionChart;
