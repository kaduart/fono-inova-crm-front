/**
 * 🎯 Meta Ads Tab
 * Dashboard de campanhas pagas do Meta (Facebook/Instagram)
 * Integrado ao MarketingDashboard - aba "Tráfego Pago"
 */

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useMetaAds, SPECIALTIES, PERIODS } from '../../hooks/useMetaAds';
import { Campaign, SpecialtyMetrics } from '../../services/metaAdsApi';

// Ícones
const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const SyncIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const TrendUpIcon = () => (
  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendDownIcon = () => (
  <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

// Cores por especialidade
const SPECIALTY_COLORS: Record<string, string> = {
  psicologia: 'bg-pink-100 text-pink-800 border-pink-200',
  fono: 'bg-purple-100 text-purple-800 border-purple-200',
  fisio: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  neuropsicologia: 'bg-violet-100 text-violet-800 border-violet-200',
  psicopedagogia: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  geral: 'bg-gray-100 text-gray-800 border-gray-200',
};

// Badge de status
const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    PAUSED: 'bg-amber-100 text-amber-800',
    DELETED: 'bg-gray-100 text-gray-600',
    ARCHIVED: 'bg-gray-100 text-gray-500',
  };
  
  const labels = {
    ACTIVE: 'Ativa',
    PAUSED: 'Pausada',
    DELETED: 'Excluída',
    ARCHIVED: 'Arquivada',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.PAUSED}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
};

// Badge de CPL
const CPLBadge = ({ cpl, specialty }: { cpl: number | null; specialty: string }) => {
  if (!cpl) return <span className="text-gray-400">-</span>;
  
  // Benchmarks por especialidade
  const benchmarks: Record<string, { good: number; warning: number }> = {
    psicologia: { good: 25, warning: 40 },
    fono: { good: 15, warning: 25 },
    fisio: { good: 20, warning: 35 },
    neuropsicologia: { good: 30, warning: 50 },
    default: { good: 20, warning: 35 },
  };
  
  const benchmark = benchmarks[specialty] || benchmarks.default;
  
  let colorClass = 'text-rose-600 bg-rose-50';
  if (cpl <= benchmark.good) colorClass = 'text-emerald-600 bg-emerald-50';
  else if (cpl <= benchmark.warning) colorClass = 'text-amber-600 bg-amber-50';
  
  return (
    <span className={`px-2 py-1 rounded-lg text-sm font-semibold ${colorClass}`}>
      R$ {cpl.toFixed(2)}
    </span>
  );
};

// Card de métrica
const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  trend,
  color = 'blue'
}: { 
  title: string; 
  value: string; 
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    amber: 'bg-amber-50 border-amber-200',
    rose: 'bg-rose-50 border-rose-200',
    purple: 'bg-purple-50 border-purple-200',
  };
  
  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <div className="flex items-center gap-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend === 'up' && <TrendUpIcon />}
        {trend === 'down' && <TrendDownIcon />}
      </div>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
};

export default function MetaAdsTab() {
  const {
    campaigns,
    metrics,
    specialties,
    loading,
    syncing,
    hasLoaded,
    pagination,
    selectedSpecialty,
    selectedPeriod,
    setSelectedSpecialty,
    setSelectedPeriod,
    load,
    loadMore,
    refresh,
    sync,
    totalSpend,
    totalLeads,
    avgCPL,
  } = useMetaAds({ lazy: true }); // Lazy loading ativado

  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  // Carrega dados automaticamente quando a aba é aberta (lazy)
  useEffect(() => {
    load();
  }, [load]);

  // Formata moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Formata número
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Formata spend de forma segura
  const getFormattedSpend = (campaign: any) => {
    if (campaign.formattedSpend) return campaign.formattedSpend;
    if (campaign.insights?.spend) return formatCurrency(campaign.insights.spend);
    return 'R$ 0,00';
  };

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tráfego Pago - Meta Ads</h2>
          <p className="text-sm text-gray-500">
            Acompanhe campanhas, custos e conversões
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshIcon />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
          
          <button
            onClick={sync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <SyncIcon />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Gasto Total"
          value={formatCurrency(totalSpend)}
          subtitle="Últimos 30 dias"
          color="rose"
        />
        <MetricCard
          title="Leads Gerados"
          value={formatNumber(totalLeads)}
          subtitle="Do tráfego pago"
          color="blue"
        />
        <MetricCard
          title="CPL Médio"
          value={avgCPL ? formatCurrency(avgCPL) : '-'}
          subtitle="Custo por lead"
          color={avgCPL && avgCPL <= 20 ? 'emerald' : avgCPL && avgCPL <= 35 ? 'amber' : 'rose'}
        />
        <MetricCard
          title="Campanhas Ativas"
          value={campaigns.filter(c => c.status === 'ACTIVE').length.toString()}
          subtitle={`de ${campaigns.length} total`}
          color="purple"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Especialidade
          </label>
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {SPECIALTIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todas</option>
            <option value="active">🟢 Ativas</option>
            <option value="paused">⏸️ Pausadas</option>
          </select>
        </div>
        
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Período
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de campanhas */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Campanhas</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            Carregando campanhas...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">Nenhuma campanha encontrada</p>
            <p className="text-sm">Clique em "Sincronizar" para buscar campanhas do Meta Ads</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campanha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gasto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leads
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPL
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns
                  .filter(c => {
                    if (statusFilter === 'active') return c.status === 'ACTIVE';
                    if (statusFilter === 'paused') return c.status === 'PAUSED';
                    return true;
                  })
                  .map((campaign) => (
                    <>
                      <tr key={campaign.campaignId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {campaign.name}
                            </span>
                            <span className={`text-xs mt-1 inline-flex items-center px-2 py-0.5 rounded border w-fit ${SPECIALTY_COLORS[campaign.specialty] || SPECIALTY_COLORS.geral}`}>
                              {campaign.specialty === 'psicologia' && 'Psicologia'}
                              {campaign.specialty === 'fono' && 'Fono'}
                              {campaign.specialty === 'fisio' && 'Fisio'}
                              {campaign.specialty === 'neuropsicologia' && 'Neuro'}
                              {campaign.specialty === 'geral' && 'Geral'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={campaign.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {getFormattedSpend(campaign)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {campaign.leadsCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <CPLBadge cpl={campaign.cpl} specialty={campaign.specialty} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setShowDetails(showDetails === campaign.campaignId ? null : campaign.campaignId)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {showDetails === campaign.campaignId ? 'Ocultar' : 'Detalhes'}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Linha de detalhes expandida */}
                      {showDetails === campaign.campaignId && (
                        <tr className="bg-blue-50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Informações da Campanha</h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="text-gray-500">ID:</span> {campaign.campaignId}</p>
                                  <p><span className="text-gray-500">Status:</span> {campaign.status === 'ACTIVE' ? '🟢 Ativa' : '⏸️ Pausada'}</p>
                                  <p><span className="text-gray-500">Objetivo:</span> {campaign.objective || 'N/A'}</p>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Métricas</h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="text-gray-500">Impressões:</span> {campaign.insights?.impressions ? formatNumber(campaign.insights.impressions) : '-'}</p>
                                  <p><span className="text-gray-500">Cliques:</span> {campaign.insights?.clicks ? formatNumber(campaign.insights.clicks) : '-'}</p>
                                  <p><span className="text-gray-500">CTR:</span> {campaign.insights?.ctr ? `${campaign.insights.ctr.toFixed(2)}%` : '-'}</p>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Conversões</h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="text-gray-500">Leads:</span> {campaign.leadsCount || 0}</p>
                                  <p><span className="text-gray-500">Pacientes:</span> {campaign.patientsCount || 0}</p>
                                  <p><span className="text-gray-500">CPA:</span> {campaign.patientsCount && campaign.insights?.spend ? formatCurrency(campaign.insights.spend / campaign.patientsCount) : '-'}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
              </tbody>
            </table>
            
            {/* Paginação */}
            {pagination.hasMore && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <span>+</span>
                      Carregar mais campanhas 
                      <span className="text-gray-500">
                        ({campaigns.length} de {pagination.total})
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
            
            {!pagination.hasMore && campaigns.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
                Mostrando {campaigns.length} de {pagination.total} campanhas
              </div>
            )}
          </div>
        )}
      </div>

      {/* Performance por Especialidade */}
      {specialties.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Performance por Especialidade</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialidade
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campanhas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gasto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leads
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPL
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CTR
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {specialties
                  .filter(s => s.campaignCount > 0 || s.leads > 0)
                  .map((spec) => (
                    <tr key={spec.specialty} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SPECIALTY_COLORS[spec.specialty] || SPECIALTY_COLORS.geral}`}>
                          {spec.specialty === 'psicologia' && 'Psicologia'}
                          {spec.specialty === 'fono' && 'Fonoaudiologia'}
                          {spec.specialty === 'fisio' && 'Fisioterapia'}
                          {spec.specialty === 'neuropsicologia' && 'Neuropsicologia'}
                          {spec.specialty === 'psicopedagogia' && 'Psicopedagogia'}
                          {spec.specialty === 'geral' && 'Geral'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {spec.campaignCount}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(spec.spend)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {spec.leads}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <CPLBadge cpl={spec.cpl} specialty={spec.specialty} />
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {spec.ctr ? `${spec.ctr.toFixed(2)}%` : '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dica/Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-1">
          💡 Como interpretar os dados
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>CPL (Custo por Lead)</strong>: Quanto você gasta para gerar 1 lead. Quanto menor, melhor.</li>
          <li>• <strong>Referências saudáveis</strong>: Fono (até R$15), Psico (até R$25), Fisio (até R$20).</li>
          <li>• <strong>Campanhas ativas</strong>: Devem ter CPL dentro da referência. Se estiver acima, revise o criativo ou público.</li>
        </ul>
      </div>
    </div>
  );
}
