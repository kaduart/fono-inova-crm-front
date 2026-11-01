// Mini-gráfico de tendência (SVG puro, sem lib): área suave + ponto final destacado.
export default function Sparkline({ values, tone = 'emerald', height = 32 }: { values: number[]; tone?: 'emerald' | 'red' | 'amber'; height?: number }) {
  if (values.length < 2) return null;
  const w = 120, h = height, pad = 3;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - pad * 2) + pad, h - pad - ((v - min) / span) * (h - pad * 2)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]} ${h} L${pts[0][0]} ${h} Z`;
  const c = tone === 'red' ? '#dc2626' : tone === 'amber' ? '#d97706' : '#16a34a';
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-1.5 block h-8 w-full" aria-hidden="true">
      <path d={area} fill={c} fillOpacity={0.1} />
      <path d={line} fill="none" stroke={c} strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={c} />
    </svg>
  );
}
