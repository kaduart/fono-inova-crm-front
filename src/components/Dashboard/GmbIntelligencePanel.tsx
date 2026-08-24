/**
 * 🧠 Painel de Inteligência GMB
 * Mostra oportunidades reais da clínica
 */

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../services/api';

interface Props {
  onSuggestionAccepted: (post: any) => void;
}

export default function GmbIntelligencePanel({ onSuggestionAccepted }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    loadData();
    loadSuggestion();
  }, []);

  const loadData = async () => {
    try {
      const response = await API.get('/gmb/intelligence/data');
      setData(response.data.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  const loadSuggestion = async () => {
    setLoading(true);
    try {
      const response = await API.get('/gmb/intelligence/suggestion');
      setSuggestion(response.data.data);
    } catch (err) {
      console.error('Erro ao carregar sugestão:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!suggestion) return;
    
    setAccepting(true);
    try {
      const response = await API.post('/gmb/intelligence/accept', {
        type: suggestion.type,
        especialidade: suggestion.especialidade
      });
      
      toast.success('🎯 Post gerado a partir da sugestão inteligente!');
      onSuggestionAccepted(response.data.data.post);
      loadSuggestion(); // Recarrega próxima sugestão
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao aceitar sugestão');
    } finally {
      setAccepting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      vaga: '🕐',
      offer: '🎁',
      review: '⭐',
      educational: '💡',
      institutional: '🏥',
      daily: '📅'
    };
    return icons[type] || '📝';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vaga: 'Vaga Disponível',
      offer: 'Oferta',
      review: 'Prova Social',
      educational: 'Educativo',
      institutional: 'Institucional',
      daily: 'Post do Dia'
    };
    return labels[type] || type;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta se não postou hoje */}
      {data?.jaPostouHoje === false && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-2xl">🔔</span>
          <div>
            <p className="font-medium text-orange-900">Atenção: Nenhum post criado hoje!</p>
            <p className="text-sm text-orange-700">O motor inteligente identificou oportunidades abaixo.</p>
          </div>
        </div>
      )}

      {/* Sugestão Principal */}
      {suggestion && (
        <div className={`rounded-lg border-2 p-6 ${suggestion.urgente ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50'}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-white">
                {getTypeIcon(suggestion.type)} {getTypeLabel(suggestion.type)}
              </span>
              <h3 className="text-lg font-bold text-gray-900 mt-2">
                Sugestão Inteligente {suggestion.urgente ? '🚨' : '💡'}
              </h3>
            </div>
            <div className={`px-3 py-1 rounded-full text-lg font-bold ${getScoreColor(suggestion.score)}`}>
              {suggestion.score}/100
            </div>
          </div>

          <p className="text-gray-700 mb-4">
            <strong>{suggestion.especialidade || 'Geral'}</strong>
            <br />
            <span className="text-sm">{suggestion.motivo}</span>
          </p>

          {suggestion.alternativas && suggestion.alternativas.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Alternativas:</p>
              <div className="flex gap-2 flex-wrap">
                {suggestion.alternativas.slice(0, 3).map((alt: any, i: number) => (
                  <span key={i} className="text-xs px-2 py-1 bg-white rounded border">
                    {getTypeIcon(alt.type)} {alt.especialidade || 'Geral'} ({alt.score})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {accepting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>✨</span>
                  Gerar Post Inteligente
                </>
              )}
            </button>
            <button
              onClick={loadSuggestion}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white"
              title="Ver próxima sugestão"
            >
              🔄
            </button>
          </div>
        </div>
      )}

      {!suggestion && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-500">Nenhuma oportunidade identificada no momento.</p>
          <p className="text-sm text-gray-400 mt-1">
            O motor analisa agenda, vendas e reviews a cada hora.
          </p>
        </div>
      )}

      {/* Cards de Dados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vagas */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">🕐 Vagas Próximos Dias</h4>
            <span className="text-2xl font-bold text-green-600">{data?.vagas?.count || 0}</span>
          </div>
          {data?.vagas?.maisUrgente ? (
            <div className="text-sm">
              <p className="text-gray-700 font-medium">{data.vagas.maisUrgente.especialidade}</p>
              <p className="text-gray-500">
                {data.vagas.maisUrgente.vagasDisponiveis} vagas • {data.vagas.maisUrgente.data}
              </p>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${data.vagas.maisUrgente.ocupacaoPercentual}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {Math.round(data.vagas.maisUrgente.ocupacaoPercentual)}% ocupado
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Agenda cheia nos próximos dias</p>
          )}
        </div>

        {/* Vendas */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">📉 Menos Vendido</h4>
            <span className="text-2xl font-bold text-yellow-600">{data?.vendas?.count || 0}</span>
          </div>
          {data?.vendas?.menosVendido ? (
            <div className="text-sm">
              <p className="text-gray-700 font-medium">{data.vendas.menosVendido.especialidade}</p>
              <p className="text-gray-500">
                {data.vendas.menosVendido.quantidade} atendimentos na semana
              </p>
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ Considere uma oferta para este serviço
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Dados insuficientes</p>
          )}
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">⭐ Reviews Recentes</h4>
            <span className="text-2xl font-bold text-purple-600">{data?.reviews?.count || 0}</span>
          </div>
          {data?.reviews?.items && data.reviews.items.length > 0 ? (
            <div className="text-sm">
              <p className="text-gray-700 line-clamp-2">
                "{data.reviews.items[0].text?.substring(0, 60)}..."
              </p>
              <p className="text-gray-500 mt-1">
                ⭐ {data.reviews.items[0].rating}/5 • {data.reviews.items[0].author}
              </p>
              <p className="text-xs text-green-600 mt-2">
                ✅ Ótimo para post de prova social!
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhuma avaliação nova</p>
          )}
        </div>
      </div>

      {/* Status do Dia */}
      <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{data?.jaPostouHoje ? '✅' : '⏳'}</span>
          <div>
            <p className="font-medium text-gray-900">
              {data?.jaPostouHoje ? 'Post do dia já criado' : 'Aguardando post do dia'}
            </p>
            <p className="text-sm text-gray-500">
              {data?.jaPostouHoje 
                ? 'O motor inteligente não gerará novo post hoje' 
                : 'O sistema sugerirá automaticamente às 7h'}
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          🔄 Atualizar
        </button>
      </div>
    </div>
  );
}
