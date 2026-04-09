/**
 * 📊 Dashboard de Conversão GMB v2 (Event-Driven)
 * 
 * Mostra métricas reais de aquisição:
 * - Qual emoção vende mais (medo, duvida, urgencia...)
 * - Taxa de conversão por especialidade
 * - Top problemas que geram agendamentos
 * - Comparativo de estágios de funil
 */

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../services/api';

// 🎨 Ícones
const TrendUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// 🎨 Cores por ângulo emocional
const ANGULO_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  medo: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: '😰 Medo' },
  duvida: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: '🤔 Dúvida' },
  urgencia: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: '⚡ Urgência' },
  comparacao: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: '⚖️ Comparação' },
  alivio: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: '😌 Alívio' },
  identificacao: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', label: '💝 Identificação' }
};

const DEFAULT_COLOR = { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', label: '📝 Geral' };

interface ConversionMetrics {
  totalLeads: number;
  totalAgendados: number;
  taxaConversaoGlobal: number;
  porAngulo: Array<{
    _id: string;
    total: number;
    agendados: number;
    taxaConversao: number;
  }>;
  porEspecialidade: Array<{
    _id: string;
    total: number;
    agendados: number;
    taxaConversao: number;
  }>;
  porFunnelStage: Array<{
    _id: string;
    total: number;
    agendados: number;
    taxaConversao: number;
  }>;
  topProblemas: Array<{
    _id: string;
    count: number;
    agendados: number;
  }>;
  evolucaoDiaria: Array<{
    _id: string;
    total: number;
    agendados: number;
  }>;
}

export default function GmbConversionDashboard() {
  const [metrics, setMetrics] = useState<ConversionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<7 | 30 | 90>(30);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadMetrics();
  }, [periodo]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/gmb/conversion-metrics?dias=${periodo}`);
      setMetrics(response.data.data);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Erro ao carregar métricas:', err);
      toast.error('Erro ao carregar métricas de conversão');
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  
  const getMelhorAngulo = () => {
    if (!metrics?.porAngulo?.length) return null;
    return metrics.porAngulo.reduce((prev, current) => 
      current.taxaConversao > prev.taxaConversao ? current : prev
    );
  };

  const getMelhorEspecialidade = () => {
    if (!metrics?.porEspecialidade?.length) return null;
    return metrics.porEspecialidade.reduce((prev, current) => 
      current.taxaConversao > prev.taxaConversao ? current : prev
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sem dados de conversão</h3>
        <p className="text-gray-500 text-sm mb-4">
          Ainda não há leads do GMB com contexto de ângulo emocional.
        </p>
        <p className="text-xs text-gray-400">
          Os dados aparecerão automaticamente quando leads começarem a chegar pelos posts com contexto.
        </p>
      </div>
    );
  }

  const melhorAngulo = getMelhorAngulo();
  const melhorEspecialidade = getMelhorEspecialidade();

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>🎯</span>
            Métricas de Aquisição (GMB)
          </h3>
          <p className="text-sm text-gray-500">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Período:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[7, 30, 90].map((dias) => (
              <button
                key={dias}
                onClick={() => setPeriodo(dias as 7 | 30 | 90)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  periodo === dias 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {dias}d
              </button>
            ))}
          </div>
          <button
            onClick={loadMetrics}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            title="Atualizar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-600 font-medium">Total de Leads</span>
            <UsersIcon />
          </div>
          <div className="text-3xl font-bold text-blue-900">{metrics.totalLeads}</div>
          <div className="text-xs text-blue-600 mt-1">via GMB com contexto</div>
        </div>

        {/* Agendamentos */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-green-600 font-medium">Agendamentos</span>
            <CalendarIcon />
          </div>
          <div className="text-3xl font-bold text-green-900">{metrics.totalAgendados}</div>
          <div className="text-xs text-green-600 mt-1">
            {formatPercent(metrics.taxaConversaoGlobal)} de conversão
          </div>
        </div>

        {/* Melhor Ângulo */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-600 font-medium">Melhor Ângulo</span>
            <TrendUpIcon />
          </div>
          {melhorAngulo ? (
            <>
              <div className="text-2xl font-bold text-purple-900">
                {ANGULO_COLORS[melhorAngulo._id]?.label || melhorAngulo._id}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {formatPercent(melhorAngulo.taxaConversao)} conversão
              </div>
            </>
          ) : (
            <div className="text-lg text-purple-400">Sem dados</div>
          )}
        </div>

        {/* Melhor Especialidade */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-orange-600 font-medium">Top Especialidade</span>
            <TargetIcon />
          </div>
          {melhorEspecialidade ? (
            <>
              <div className="text-lg font-bold text-orange-900 capitalize">
                {melhorEspecialidade._id.replace(/_/g, ' ')}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                {formatPercent(melhorEspecialidade.taxaConversao)} conversão
              </div>
            </>
          ) : (
            <div className="text-lg text-orange-400">Sem dados</div>
          )}
        </div>
      </div>

      {/* Grid de análises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Performance por Ângulo Emocional */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🎭</span>
            Performance por Ângulo Emocional
          </h4>
          
          {metrics.porAngulo.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Nenhum dado de ângulo emocional ainda
            </p>
          ) : (
            <div className="space-y-3">
              {metrics.porAngulo
                .sort((a, b) => b.taxaConversao - a.taxaConversao)
                .map((ang) => {
                  const colors = ANGULO_COLORS[ang._id] || DEFAULT_COLOR;
                  return (
                    <div 
                      key={ang._id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-medium ${colors.text}`}>
                          {colors.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {ang.total} leads
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${colors.text}`}>
                          {formatPercent(ang.taxaConversao)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {ang.agendados} agendados
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
            <strong>💡 Insight:</strong> O ângulo "{melhorAngulo?._id || 'N/A'}" está convertendo 
            {melhorAngulo ? ` ${formatPercent(melhorAngulo.taxaConversao)}` : ' N/A'}. 
            Considere criar mais posts com essa abordagem.
          </div>
        </div>

        {/* Performance por Especialidade */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🏥</span>
            Performance por Especialidade
          </h4>
          
          {metrics.porEspecialidade.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Nenhum dado por especialidade ainda
            </p>
          ) : (
            <div className="space-y-3">
              {metrics.porEspecialidade
                .sort((a, b) => b.taxaConversao - a.taxaConversao)
                .map((esp) => (
                  <div 
                    key={esp._id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <div>
                      <span className="font-medium text-gray-900 capitalize">
                        {esp._id.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {esp.total} leads
                      </span>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${
                        esp.taxaConversao > 0.3 ? 'text-green-600' : 
                        esp.taxaConversao > 0.15 ? 'text-yellow-600' : 'text-gray-600'
                      }`}>
                        {formatPercent(esp.taxaConversao)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {esp.agendados} agendados
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Performance por Estágio do Funil */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🎯</span>
            Performance por Funil
          </h4>
          
          {metrics.porFunnelStage.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Nenhum dado de funil ainda
            </p>
          ) : (
            <div className="space-y-4">
              {metrics.porFunnelStage
                .sort((a, b) => b.taxaConversao - a.taxaConversao)
                .map((stage) => {
                  const stageConfig: Record<string, { label: string; color: string; desc: string }> = {
                    top: { label: '📢 Topo (Awareness)', color: 'bg-blue-500', desc: 'Atrair atenção' },
                    middle: { label: '📚 Meio (Consideração)', color: 'bg-yellow-500', desc: 'Educar e engajar' },
                    bottom: { label: '💰 Fundo (Conversão)', color: 'bg-green-500', desc: 'Agendar consulta' }
                  };
                  const config = stageConfig[stage._id] || { label: stage._id, color: 'bg-gray-500', desc: '' };
                  
                  return (
                    <div key={stage._id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{config.label}</span>
                        <span className="text-sm font-bold text-gray-700">
                          {formatPercent(stage.taxaConversao)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${config.color} h-2 rounded-full transition-all`}
                          style={{ width: `${Math.min(stage.taxaConversao * 100 * 2, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{config.desc}</span>
                        <span>{stage.total} leads • {stage.agendados} agendados</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Top Problemas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🔥</span>
            Top Problemas (Mais Buscados)
          </h4>
          
          {metrics.topProblemas.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Nenhum dado de problemas ainda
            </p>
          ) : (
            <div className="space-y-3">
              {metrics.topProblemas.slice(0, 5).map((prob, idx) => (
                <div 
                  key={prob._id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <span className={`
                    w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                    ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                      idx === 1 ? 'bg-gray-200 text-gray-700' : 
                      idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}
                  `}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {prob._id}
                    </p>
                    <p className="text-xs text-gray-500">
                      {prob.count} leads • {prob.agendados} agendados
                    </p>
                  </div>
                  <div className="text-sm font-bold text-green-600">
                    {formatPercent(prob.agendados / prob.count)}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <strong>💡 Dica:</strong> Esses são os problemas que os pais realmente buscam. 
            Crie mais conteúdo sobre os top 3 para maximizar alcance.
          </div>
        </div>
      </div>

      {/* Footer com ações */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <strong>🚀 Recomendação:</strong> 
          {melhorAngulo && melhorAngulo.taxaConversao > 0.25 
            ? ` O ângulo "${ANGULO_COLORS[melhorAngulo._id]?.label || melhorAngulo._id}" está performando muito bem. `
            : ' Teste diferentes ângulos emocionais para encontrar o que mais converte. '
          }
          {melhorEspecialidade 
            ? `A especialidade "${melhorEspecialidade._id.replace(/_/g, ' ')}" merece mais atenção.`
            : ''}
        </div>
        
        <button
          onClick={() => window.open('/admin/leads?source=gmb', '_blank')}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          Ver Leads GMB →
        </button>
      </div>
    </div>
  );
}
