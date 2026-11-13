import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { ReactNode } from 'react';

const categoryLabels: Record<string, string> = {
  fonoaudiologia: 'Fonoaudiologia', autismo: 'Autismo', aprendizagem: 'Aprendizagem',
  geografica: 'Geográfica', psicologia: 'Psicologia', desenvolvimento: 'Desenvolvimento',
  terapia_ocupacional: 'Terapia ocupacional', neuropsicologia: 'Neuropsicologia',
};
export const categoryLabel = (category: string) => categoryLabels[category] || (category ? category.replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase()) : 'Sem categoria');

const colors = ['#177b68', '#3e78c5', '#b88226', '#8170b0', '#549d86', '#bd6c53', '#658692', '#a37894'];
const format = (value: number) => value.toLocaleString('pt-BR');

export function AnalyticsEmpty({ children }: { children: ReactNode }) {
  return <div className="flex min-h-40 items-center gap-4 rounded-xl bg-slate-50 px-5 py-6 text-sm leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
    <BarChart3 className="hidden h-9 w-9 shrink-0 text-slate-400 sm:block" aria-hidden="true" />
    <p className="max-w-prose">{children}</p>
  </div>;
}

/** Text-first ranking keeps names readable on mobile; no animated automatic data updates. */
export function AnalyticsRanking({ items, unit, color = '#3979c6', empty }: {
  items: { id: string; label: string; value: number }[]; unit: string; color?: string; empty: string;
}) {
  const ranked = [...items].filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);
  if (!ranked.length) return <AnalyticsEmpty>{empty}</AnalyticsEmpty>;
  const maximum = ranked[0].value;
  return <ol className="space-y-4" aria-label={`Ranking por ${unit}`}>
    {ranked.map((item, index) => <li key={item.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] gap-x-3 gap-y-2">
      <span className="pt-0.5 text-xs tabular-nums text-slate-400" aria-hidden="true">{index + 1}</span>
      <span className="min-w-0 break-words text-sm font-medium leading-snug text-slate-700 dark:text-slate-200">{item.label}</span>
      <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{format(item.value)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{unit}</span></span>
      <span className="col-start-2 col-end-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        <span className="block h-full origin-left rounded-full" style={{ backgroundColor: color, width: '100%', transform: `scaleX(${item.value / maximum})` }} />
      </span>
    </li>)}
  </ol>;
}

export function AnalyticsCategoryChart({ pages }: { pages: { category: string }[] }) {
  const counts = new Map<string, number>();
  pages.forEach(page => counts.set(page.category || '', (counts.get(page.category || '') || 0) + 1));
  const data = [...counts].map(([key, value]) => ({ key, name: categoryLabel(key), value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'pt-BR'));
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
    <div className="mb-5"><h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Distribuição por categoria</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Composição das landing pages publicadas por especialidade.</p></div>
    {!data.length ? <AnalyticsEmpty>Nenhuma landing page disponível para distribuir por categoria.</AnalyticsEmpty> : <div className="grid items-center gap-6 md:grid-cols-[minmax(200px,.8fr)_minmax(0,1.2fr)]">
      <div className="relative mx-auto h-60 w-full max-w-xs" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%"><PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="90%" paddingAngle={3} cornerRadius={4} stroke="none" isAnimationActive={false}>
            {data.map((item, i) => <Cell key={item.key} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{payload[0].name}: <strong>{payload[0].value} LPs</strong></div> : null} />
        </PieChart></ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">{format(pages.length)}</span><span className="mt-1 text-xs text-slate-500 dark:text-slate-400">landing pages</span></div>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800" aria-label="Quantidade de landing pages por categoria">
        {data.map((item, i) => <li key={item.key} className="flex items-center gap-3 py-3 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} aria-hidden="true" />
          <span className="min-w-0 flex-1 break-words text-slate-700 dark:text-slate-200">{item.name}</span>
          <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{format(item.value)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">LPs</span></span>
          <span className="w-12 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">{Math.round(item.value / pages.length * 100)}%</span>
        </li>)}
      </ul>
    </div>}
  </section>;
}
