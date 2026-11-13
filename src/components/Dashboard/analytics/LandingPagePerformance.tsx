import { AnalyticsCategoryChart, AnalyticsRanking } from './AnalyticsVisuals';

interface Page { slug: string; title: string; category: string; views: number; leads: number }
const panel = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6';
const heading = 'text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100';

export function LandingPagePerformance({ pages }: { pages: Page[] }) {
  const views = pages.reduce((sum, page) => sum + (page.views || 0), 0);
  const leads = pages.reduce((sum, page) => sum + (page.leads || 0), 0);
  const top = [...pages].filter(p => p.views > 0).sort((a, b) => b.views - a.views)[0];
  // Preserve the existing minimum sample and attention thresholds.
  const converter = pages.filter(p => p.views > 10 && p.leads > 0).sort((a, b) => b.leads / b.views - a.leads / a.views)[0];
  const attention = pages.filter(p => p.views > 50 && p.leads === 0);
  return <div className="space-y-5">
    <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-4">
      {[['LPs disponíveis', pages.length.toLocaleString('pt-BR'), 'Páginas disponíveis no relatório'], ['Visualizações', views.toLocaleString('pt-BR'), 'No período selecionado'], ['Leads das LPs', leads.toLocaleString('pt-BR'), 'Atribuídos à página de origem'], ['Taxa de conversão', views ? `${(leads / views * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—', 'Leads ÷ visualizações']].map(([label, value, note]) => <div key={label} className="border-b border-r border-slate-100 px-5 py-5 last:border-r-0 dark:border-slate-800 lg:border-b-0"><dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">{value}</dd><p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{note}</p></div>)}
    </dl>
    <div className="grid gap-5 lg:grid-cols-2">
      {(['views', 'leads'] as const).map(metric => <section key={metric} className={panel}>
        <h2 className={heading}>{metric === 'views' ? 'LPs mais vistas' : 'LPs que mais geram leads'}</h2>
        <p className="mb-6 mt-1 text-sm text-slate-500 dark:text-slate-400">Até dez páginas, ordenadas pelo resultado no período.</p>
        <AnalyticsRanking items={pages.map(p => ({ id: p.slug, label: p.title || p.slug, value: p[metric] || 0 }))} unit={metric === 'views' ? 'views' : 'leads'} color={metric === 'views' ? '#3e78c5' : '#177b68'} empty={metric === 'views' ? 'Nenhuma visualização registrada para estas páginas no período selecionado.' : 'Nenhum lead atribuído a estas páginas no período selecionado.'} />
      </section>)}
    </div>
    <AnalyticsCategoryChart pages={pages} />
    <section className={panel}><h2 className={heading}>Leitura do período</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div><h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Mais acessada</h3><p className="mt-2 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{top?.title || top?.slug || 'Sem tráfego registrado'}</p><p className="mt-1 text-sm tabular-nums text-emerald-800 dark:text-emerald-300">{top ? `${top.views.toLocaleString('pt-BR')} visualizações` : 'Aguardando dados do período'}</p></div>
        <div><h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Maior conversão</h3><p className="mt-2 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{converter?.title || converter?.slug || 'Sem conversões elegíveis'}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{converter ? `${(converter.leads / converter.views * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% de conversão` : 'Considera páginas com mais de 10 visualizações e ao menos um lead.'}</p></div>
        <div><h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Pontos de atenção</h3><p className={`mt-2 text-sm font-semibold ${attention.length ? 'text-amber-800 dark:text-amber-300' : 'text-slate-800 dark:text-slate-100'}`}>{attention.length ? `${attention.length} LPs com tráfego e sem leads` : views ? 'Nenhuma LP acima do limite de atenção' : 'Sem tráfego para avaliar'}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Mais de 50 visualizações, sem lead atribuído.</p></div>
      </div>
    </section>
  </div>;
}
