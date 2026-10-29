// Gráfico da aba Evolução: um gráfico de linha por área/métrica (small multiples), escala fixa
// 0–10 como no plano, meta do plano tracejada, chips de período e vista em tabela.
// Antes: barras agrupadas por data num card escuro fixo, que não diziam se a área melhorava.
import { useEffect, useMemo, useRef, useState } from 'react';

type Objective = { area?: string; description?: string; target?: number };

interface Props {
  chartData: any;
  /** objetivos do plano atual, para a meta e o texto do objetivo de cada área */
  objectives?: Objective[];
}

// Ordem fixa das cores (validada para daltonismo); a 4ª área em diante repete com rótulo próprio.
const SERIES = [
  'stroke-[#2a78d6] fill-[#2a78d6] dark:stroke-[#3987e5] dark:fill-[#3987e5]',
  'stroke-[#eb6834] fill-[#eb6834] dark:stroke-[#d95926] dark:fill-[#d95926]',
  'stroke-[#1baf7a] fill-[#1baf7a] dark:stroke-[#199e70] dark:fill-[#199e70]',
  'stroke-[#eda100] fill-[#eda100] dark:stroke-[#c98500] dark:fill-[#c98500]',
  'stroke-[#e87ba4] fill-[#e87ba4] dark:stroke-[#d55181] dark:fill-[#d55181]',
];
const DOT = ['bg-[#2a78d6] dark:bg-[#3987e5]', 'bg-[#eb6834] dark:bg-[#d95926]', 'bg-[#1baf7a] dark:bg-[#199e70]', 'bg-[#eda100] dark:bg-[#c98500]', 'bg-[#e87ba4] dark:bg-[#d55181]'];

const LABEL_MAP: Record<string, string> = {
  language: 'Linguagem', motor: 'Motor', cognitive: 'Cognitivo',
  behavior: 'Comportamento', social: 'Social',
  linguagem_expressiva: 'Linguagem expressiva', linguagem_receptiva: 'Linguagem receptiva',
  pragmatica: 'Pragmática', voz: 'Voz', motricidade_orofacial: 'Motricidade orofacial',
  emocional: 'Emocional', autonomia: 'Autonomia', sensorial: 'Sensorial',
  atencao: 'Atenção', memoria: 'Memória', comunicacao: 'Comunicação',
};
// acentos das palavras que aparecem em chaves cruas ("trocas_fonologicas_")
const ACCENTS: Record<string, string> = {
  fonologicas: 'fonológicas', fonologica: 'fonológica', pragmatica: 'pragmática', atencao: 'atenção',
  memoria: 'memória', comunicacao: 'comunicação', fluencia: 'fluência', audicao: 'audição',
  articulacao: 'articulação', degluticao: 'deglutição', respiracao: 'respiração', coordenacao: 'coordenação',
};
const PERIODS = [{ n: 3, label: 'Últimas 3' }, { n: 6, label: 'Últimas 6' }, { n: 0, label: 'Tudo' }];

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const prettyName = (key: string) => {
  if (LABEL_MAP[key]) return LABEL_MAP[key];
  const words = key.replace(/[_-]+/g, ' ').trim().split(/\s+/).filter(Boolean).map(w => ACCENTS[w.toLowerCase()] || w);
  const s = words.join(' ');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : key;
};

const lev = (a: string, b: string) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const shortDate = (d: string) => {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
};

type Series = { key: string; label: string; values: (number | null)[]; target?: number; goal?: string; similarTo?: string; color: number };

function MiniChart({ s, dates }: { s: Series; dates: string[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // viewBox com a largura real do card: num card largo o SVG escalava e o texto ficava enorme
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(240);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pts = s.values.map((v, i) => ({ v, i })).filter(p => p.v !== null && p.v !== undefined) as { v: number; i: number }[];
  const max = Math.max(10, ...pts.map(p => Math.ceil(p.v)), s.target ?? 0);
  const H = 120, L = 22, R = 8, T = 12, B = 20, iw = W - L - R, ih = H - T - B;
  const x = (i: number) => L + (dates.length === 1 ? iw / 2 : (i * iw) / (dates.length - 1));
  const y = (v: number) => T + ih - (v / max) * ih;
  const ticks = [0, Math.round(max / 2), max];
  // com muitas datas, rotula só algumas (primeira, última e espaçadas)
  const every = Math.max(1, Math.ceil(dates.length / 6));
  const last = pts[pts.length - 1];
  return (
    <div className="relative" ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img"
        aria-label={`${s.label}: ${pts.map(p => `${shortDate(dates[p.i])} ${fmt(p.v)}`).join(', ')}`}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-gray-200 dark:stroke-gray-700" />
            <text x={L - 6} y={y(t) + 3} textAnchor="end" className="fill-gray-500 text-[11px] tabular-nums dark:fill-gray-400">{t}</text>
          </g>
        ))}
        {s.target != null && (
          <g>
            <line x1={L} x2={W - R} y1={y(s.target)} y2={y(s.target)} strokeDasharray="4 4" strokeWidth={1.5} className="stroke-slate-500 dark:stroke-slate-400" />
            <text x={W - R} y={y(s.target) - 4} textAnchor="end" className="fill-slate-600 text-[11px] dark:fill-slate-300">meta {fmt(s.target)}</text>
          </g>
        )}
        {dates.map((d, i) => (i % every === 0 || i === dates.length - 1) && (
          <text key={i} x={x(i)} y={H - 5} textAnchor="middle" className="fill-gray-500 text-[11px] tabular-nums dark:fill-gray-400">{shortDate(d)}</text>
        ))}
        {pts.length > 1 && (
          <polyline fill="none" strokeWidth={2} strokeLinejoin="round" className={SERIES[s.color]} style={{ fill: 'none' }}
            points={pts.map(p => `${x(p.i)},${y(p.v)}`).join(' ')} />
        )}
        {pts.map(p => (
          <g key={p.i}>
            <circle cx={x(p.i)} cy={y(p.v)} r={hover === p.i ? 6 : 4.5} strokeWidth={2} className={`${SERIES[s.color]} !stroke-white dark:!stroke-gray-900`} />
            <circle cx={x(p.i)} cy={y(p.v)} r={14} fill="transparent" onMouseEnter={() => setHover(p.i)} onMouseLeave={() => setHover(null)}>
              <title>{`${shortDate(dates[p.i])} · ${fmt(p.v)}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      {hover !== null && s.values[hover] != null && (
        <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow dark:bg-gray-100 dark:text-gray-900"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(s.values[hover] as number) / H) * 100}%`, marginTop: -8 }}>
          {shortDate(dates[hover])} · {fmt(s.values[hover] as number)}{s.target != null ? ` de ${fmt(s.target)}` : ''}
        </div>
      )}
      {!last && <p className="text-xs text-gray-600 dark:text-gray-400">Sem notas no período.</p>}
    </div>
  );
}

function SeriesCard({ s, dates }: { s: Series; dates: string[] }) {
  const vals = s.values.filter((v): v is number => v !== null && v !== undefined);
  const last = vals.length ? vals[vals.length - 1] : null;
  const prev = vals.length > 1 ? vals[vals.length - 2] : null;
  const delta = last !== null && prev !== null ? +(last - prev).toFixed(1) : null;
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[s.color]}`} aria-hidden />
        <span className="truncate">{s.label}</span>
      </h4>
      {s.goal && <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">Objetivo: {s.goal}</p>}
      {s.similarTo && (
        <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
          Parecido com "{s.similarTo}". Se for a mesma, corrija o nome no cadastro.
        </p>
      )}
      <div className="mb-1 mt-2 flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-50">{last !== null ? fmt(last) : '—'}</span>
        {last !== null && <span className="text-sm text-gray-600 dark:text-gray-400">{s.target != null ? `de ${fmt(s.target)}` : 'de 10'}</span>}
        {delta !== null ? (
          <span className={`rounded-full px-2 py-px text-xs font-semibold ${delta > 0 ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : delta < 0 ? 'bg-red-50 text-red-800 dark:bg-red-500/15 dark:text-red-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
            {delta > 0 ? `▲ +${fmt(delta)} vs anterior` : delta < 0 ? `▼ ${fmt(delta)} vs anterior` : '= estável'}
          </span>
        ) : vals.length === 1 ? (
          <span className="rounded-full bg-gray-100 px-2 py-px text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">1 registro</span>
        ) : null}
      </div>
      {/* com uma nota só, um ponto solto não diz nada: fica só o número */}
      {vals.length > 1 && <MiniChart s={s} dates={dates} />}
    </div>
  );
}

const EvolutionChart = ({ chartData, objectives = [] }: Props) => {
  const [n, setN] = useState(6);
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const allDates: string[] = chartData?.dates || [];
  const from = n > 0 ? Math.max(0, allDates.length - n) : 0;
  const dates = allDates.slice(from);

  const groups = useMemo(() => {
    const goalOf = (key: string, label: string) => objectives.find(o => o.area && (norm(o.area) === norm(key) || norm(o.area) === norm(label)));
    const build = (entries: [string, any][], kind: 'area' | 'metric'): Series[] => {
      const list: Series[] = entries.map(([key, data], i) => {
        const raw = Array.isArray(data) ? data : data?.values || [];
        const label = kind === 'metric' ? (data?.config?.description ? prettyName(String(data.config.description)) : prettyName(key)) : prettyName(key);
        const obj = kind === 'area' ? goalOf(key, label) : undefined;
        return {
          key, label, color: i % SERIES.length,
          values: raw.slice(from).map((v: any) => (v === null || v === undefined || v === '' ? null : Number(v))),
          target: obj?.target ?? (typeof data?.config?.target === 'number' ? data.config.target : undefined),
          goal: obj?.description && !/^objetivo em /i.test(obj.description.trim()) ? obj.description : undefined,
        };
      });
      // nomes quase iguais (ex.: "Lingagem receptiva" e "Linguagem receptiva"): avisa, não junta
      list.forEach(s => {
        const twin = list.find(o => o !== s && norm(o.label) !== norm(s.label) && norm(s.label).length > 5 && lev(norm(o.label), norm(s.label)) <= 2);
        if (twin) s.similarTo = twin.label;
        const same = list.find(o => o !== s && norm(o.label) === norm(s.label));
        if (same) s.similarTo = same.label;
      });
      return list;
    };
    return {
      areas: build(Object.entries(chartData?.evaluationTypes || {}), 'area'),
      metrics: build(Object.entries(chartData?.metrics || {}), 'metric'),
    };
  }, [chartData, objectives, from]);

  if (!allDates.length || (!groups.areas.length && !groups.metrics.length)) {
    return <p className="py-8 text-center text-sm text-gray-600 dark:text-gray-400">Ainda não há notas suficientes para o gráfico.</p>;
  }

  const chip = (on: boolean) => `inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${on ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-200' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200'}`;
  const seg = (on: boolean) => `min-h-9 px-3 text-sm font-semibold ${on ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200'}`;

  const section = (title: string, list: Series[]) => list.length > 0 && (
    <section className="space-y-2" aria-label={title}>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      {view === 'chart' ? (
        <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(s => <SeriesCard key={s.key} s={s} dates={dates} />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <th className="px-3 py-2 font-semibold">{title === 'Áreas' ? 'Área' : 'Métrica'}</th>
                {dates.map((d, i) => <th key={i} className="px-3 py-2 font-semibold">{shortDate(d)}</th>)}
                <th className="px-3 py-2 font-semibold">Meta</th>
              </tr>
            </thead>
            <tbody>
              {list.map(s => (
                <tr key={s.key} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{s.label}</td>
                  {s.values.map((v, i) => <td key={i} className="px-3 py-2 text-gray-800 dark:text-gray-200">{v === null ? '—' : fmt(v)}</td>)}
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{s.target != null ? fmt(s.target) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Período do gráfico">
          {PERIODS.map(p => (
            <button key={p.n} type="button" aria-pressed={n === p.n} className={chip(n === p.n)} onClick={() => setN(p.n)}>{p.label}</button>
          ))}
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600" role="group" aria-label="Vista">
          <button type="button" aria-pressed={view === 'chart'} className={seg(view === 'chart')} onClick={() => setView('chart')}>Gráfico</button>
          <button type="button" aria-pressed={view === 'table'} className={`${seg(view === 'table')} border-l border-gray-300 dark:border-gray-600`} onClick={() => setView('table')}>Tabela</button>
        </div>
      </div>
      {section('Áreas', groups.areas)}
      {section('Métricas', groups.metrics)}
    </div>
  );
};

export default EvolutionChart;
