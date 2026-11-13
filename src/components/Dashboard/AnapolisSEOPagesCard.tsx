/**
 * 🎯 AnapolisSEOPagesCard
 * Card específico para monitorar as 7 páginas SEO de especialidades em Anápolis
 */

import { useMemo } from 'react';
import { MapPin, TrendingUp, Users, MousePointer, ExternalLink, Award, AlertTriangle } from 'lucide-react';
import { AnalyticsRanking } from './analytics/AnalyticsVisuals';

interface PageMetric {
  path: string;
  title?: string;
  views: number;
  users: number;
  bounceRate: number;
  leads: number;
  icon?: string;
  avgEngagementTime?: number;
}

interface AnapolisSEOPagesCardProps {
  pages: PageMetric[];
  loading?: boolean;
}

const ANAPOLIS_PAGES = [
  { id: 'fonoaudiologia-anapolis', title: 'Fonoaudiologia', path: '/fonoaudiologia-anapolis', icon: '🗣️' },
  { id: 'psicologia-infantil-anapolis', title: 'Psicologia Infantil', path: '/psicologia-infantil-anapolis', icon: '🧠' },
  { id: 'terapia-ocupacional-anapolis', title: 'Terapia Ocupacional', path: '/terapia-ocupacional-anapolis', icon: '🤲' },
  { id: 'psicomotricidade-anapolis', title: 'Psicomotricidade', path: '/psicomotricidade-anapolis', icon: '🏃‍♀️' },
  { id: 'teste-da-linguinha-anapolis', title: 'Teste da Linguinha', path: '/teste-da-linguinha-anapolis', icon: '👅' },
  { id: 'fisioterapia-infantil-anapolis', title: 'Fisioterapia Infantil', path: '/fisioterapia-infantil-anapolis', icon: '🏃' },
  { id: 'avaliacao-neuropsicologica-anapolis', title: 'Avaliação Neuropsicológica', path: '/avaliacao-neuropsicologica-anapolis', icon: '🧩' },
];

export default function AnapolisSEOPagesCard({ pages, loading }: AnapolisSEOPagesCardProps) {
  // Processar métricas das páginas de Anápolis
  const anapolisMetrics = useMemo(() => {
    return ANAPOLIS_PAGES.map(page => {
      const pageData = pages?.find(p => 
        p.path === page.path || 
        p.path?.includes(page.path) ||
        p.path?.includes(page.id)
      );

      return {
        ...page,
        views: pageData?.views || 0,
        users: pageData?.users || 0,
        bounceRate: pageData?.bounceRate || 0,
        leads: pageData?.leads || 0,
      };
    }).sort((a, b) => b.views - a.views);
  }, [pages]);

  // Calcular totais
  const totals = useMemo(() => {
    return anapolisMetrics.reduce((acc, page) => ({
      views: acc.views + page.views,
      users: acc.users + page.users,
      leads: acc.leads + page.leads,
    }), { views: 0, users: 0, leads: 0 });
  }, [anapolisMetrics]);

  // Taxa de conversão geral
  const conversionRate = totals.views > 0 
    ? ((totals.leads / totals.views) * 100).toFixed(1) 
    : '0';

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4 motion-reduce:animate-none">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Páginas SEO - Anápolis
              </h3>
              <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                7 páginas de especialidade para busca orgânica local (ex: "fonoaudiologia anápolis") — sem vínculo com campanhas pagas
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
            {totals.views.toLocaleString()} views
          </span>
        </div>
      </div>

      {/* Métricas Resumidas */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 dark:divide-slate-800 dark:border-slate-800 sm:grid-cols-4 [&>div]:rounded-none [&>div]:bg-transparent [&>div]:px-5 [&>div]:py-4 [&>div]:text-left [&>div>div:first-child]:justify-start [&>div>div:last-child]:tabular-nums">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
            <Users className="w-3 h-3" />
            Usuários
          </div>
          <div className="text-xl font-bold text-gray-900">
            {totals.users.toLocaleString()}
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
            <MousePointer className="w-3 h-3" />
            Page Views
          </div>
          <div className="text-xl font-bold text-blue-600">
            {totals.views.toLocaleString()}
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
            <TrendingUp className="w-3 h-3" />
            Leads
          </div>
          <div className="text-xl font-bold text-green-600">
            {totals.leads.toLocaleString()}
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
            <TrendingUp className="w-3 h-3" />
            Conv. Rate
          </div>
          <div className="text-xl font-bold text-purple-600">
            {totals.views > 0 ? `${conversionRate}%` : '—'}
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-8 border-b border-slate-100 p-5 dark:border-slate-800 sm:p-6 lg:grid-cols-2">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Views por Página</h4>
          <AnalyticsRanking items={anapolisMetrics.map(p => ({ id: p.id, label: p.title, value: p.views }))}
            unit="views" empty="Nenhuma visualização registrada para estas páginas no período selecionado." />
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Leads por Página</h4>
          <AnalyticsRanking items={anapolisMetrics.map(p => ({ id: p.id, label: p.title, value: p.leads }))}
            unit="leads" color="#177b68" empty="Nenhum lead atribuído a estas páginas no período selecionado." />
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-b border-gray-100 bg-gray-50">
        {(() => {
          const topPage = anapolisMetrics.find(p => p.views > 0);
          const topConverter = anapolisMetrics.filter(p => p.views > 5 && p.leads > 0).sort((a, b) => ((b.leads/b.views) || 0) - ((a.leads/a.views) || 0))[0];
          const needsAttention = anapolisMetrics.filter(p => p.views > 10 && p.leads === 0);
          
          return (
            <>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-800">Mais Acessada</span>
                </div>
                <p className="text-sm font-medium">{topPage?.title || 'Sem tráfego registrado'}</p>
                {topPage && <p className="text-lg font-bold text-green-600">{topPage.views} views</p>}
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-800">Maior Conversão</span>
                </div>
                <p className="text-sm font-medium">{topConverter?.title || 'Sem conversões elegíveis'}</p>
                <p className="text-lg font-bold text-blue-600">
                  {topConverter ? `${((topConverter.leads/topConverter.views) * 100).toFixed(1)}%` : '—'}
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-800">Precisa Atenção</span>
                </div>
                <p className="text-sm">
                  {needsAttention.length > 0 
                    ? `${needsAttention.length} páginas sem leads` 
                    : totals.views > 0 ? 'Nenhuma página acima do limite de atenção.' : 'Sem tráfego para avaliar.'}
                </p>
              </div>
            </>
          );
        })()}
      </div>

      {/* Lista de Páginas */}
      <div className="divide-y divide-gray-100">
        {anapolisMetrics.map((page, index) => {
          const pageConversionRate = page.views > 0 
            ? ((page.leads / page.views) * 100).toFixed(1) 
            : '0';
          
          return (
            <div 
              key={page.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-mono text-sm w-6">
                    #{index + 1}
                  </span>
                  <span className="text-2xl">{page.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">
                      {page.title}
                    </div>
                    <code className="text-xs text-gray-400">
                      {page.path}
                    </code>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Views */}
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {page.views.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">views</div>
                  </div>

                  {/* Users */}
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-semibold text-gray-700">
                      {page.users.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">users</div>
                  </div>

                  {/* Bounce Rate */}
                  <div className="text-right hidden md:block">
                    <div className={`text-sm font-semibold ${
                      page.bounceRate > 60 ? 'text-red-500' : 
                      page.bounceRate > 40 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {page.bounceRate ? `${page.bounceRate.toFixed(0)}%` : '-'}
                    </div>
                    <div className="text-xs text-gray-500">bounce</div>
                  </div>

                  {/* Leads */}
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-600">
                      {page.leads}
                    </div>
                    <div className="text-xs text-gray-500">leads</div>
                  </div>

                  {/* Conv Rate */}
                  <div className="text-right w-16">
                    <div className={`text-sm font-semibold ${
                      parseFloat(pageConversionRate) > 5 ? 'text-green-600' : 
                      parseFloat(pageConversionRate) > 2 ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {pageConversionRate}%
                    </div>
                  </div>

                  {/* Link */}
                  <a
                    href={`https://fonoinova.com.br${page.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Ver página"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>7 páginas de especialidade otimizadas para SEO local</span>
          <span>Meta: Top 3 no Google para cada especialidade em Anápolis</span>
        </div>
      </div>
    </div>
  );
}
