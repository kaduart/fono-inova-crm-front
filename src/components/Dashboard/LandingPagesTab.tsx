/**
 * 🎯 Landing Pages Tab
 * Gerencia landing pages de alta conversão no Marketing Dashboard
 */

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useLandingPages, LandingPage } from '../../hooks/useLandingPages';
import API from '../../services/api';
import { Copy, ExternalLink, Link2, TrendingUp, Calendar, Sparkles, RefreshCw, Globe, MapPin, Play, Clock } from 'lucide-react';

// Categorias com cores
const CATEGORY_CONFIG = {
  fonoaudiologia: { label: '🗣️ Fonoaudiologia', color: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  autismo: { label: '🧩 Autismo', color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  psicologia: { label: '🧠 Psicologia', color: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
  aprendizagem: { label: '📚 Aprendizagem', color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  terapia_ocupacional: { label: '🤲 Terapia Ocupacional', color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  geografica: { label: '📍 Geográfica', color: 'gray', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
  neuropsicologia: { label: '🧩 Neuropsicologia', color: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
  desenvolvimento: { label: '🌱 Desenvolvimento', color: 'teal', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' }
};

export default function LandingPagesTab() {
  const {
    landingPages,
    dailyPages,
    stats,
    loading,
    fetchLandingPages,
    fetchDailyPages,
    fetchStats,
    suggestForPost,
    getPostSuggestion,
    createFullPost,
    markAsUsed,
    seedLandingPages,
    getCategoryLabel,
    getCategoryColor
  } = useLandingPages();

  // Estados locais
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestedPages, setSuggestedPages] = useState<LandingPage[]>([]);
  const [generatingPost, setGeneratingPost] = useState<string | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedResult, setSeedResult] = useState<{ created: number; skipped: number; total: number } | null>(null);
  
  // Cron states
  const [cronStatus, setCronStatus] = useState<{ scheduled: boolean; nextRuns: Array<{ time: string; label: string }> } | null>(null);
  const [runningCron, setRunningCron] = useState(false);

  // Carrega dados iniciais
  useEffect(() => {
    fetchLandingPages();
    fetchDailyPages();
    fetchStats();
    loadSuggestions();
    fetchCronStatus();
  }, []);
  
  const fetchCronStatus = async () => {
    try {
      const response = await API.get('/landing-pages/cron/status');
      setCronStatus(response.data?.data || null);
    } catch (err) {
      console.error('Erro ao buscar status do cron:', err);
    }
  };
  
  const handleRunCronNow = async () => {
    if (!confirm('Executar cron manualmente? Isso criará posts para as LPs do dia.')) return;
    
    setRunningCron(true);
    try {
      const response = await API.post('/landing-pages/cron/run-now');
      const result = response.data?.data;
      
      if (result?.summary) {
        toast.success(`Cron executado! ${result.summary.success} posts criados.`);
      }
      
      // Recarrega dados
      fetchDailyPages();
      fetchLandingPages();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao executar cron');
    } finally {
      setRunningCron(false);
    }
  };

  // Recarrega quando muda categoria
  useEffect(() => {
    fetchLandingPages({ category: selectedCategory, search: searchTerm });
  }, [selectedCategory, searchTerm]);

  const loadSuggestions = async () => {
    const suggestions = await suggestForPost();
    setSuggestedPages(suggestions);
  };

  const handleCopyLink = (slug: string) => {
    const url = `https://clinicafonoinova.com.br/lp/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const handleCreatePost = async (page: LandingPage) => {
    setGeneratingPost(page.slug);
    try {
      // 🎯 Cria post COMPLETO com imagem via ImageBank
      const result = await createFullPost(page.slug);
      
      if (result.hasImage) {
        toast.success(
          <div>
            <strong>Post criado com sucesso!</strong>
            <div className="text-sm mt-1">
              ✅ Imagem: {result.imageProvider === 'imagebank-reused' ? 'Reutilizada do banco' : 'Gerada nova'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              ID: {result.postId.substring(0, 8)}...
            </div>
          </div>,
          { autoClose: 4000 }
        );
      } else {
        toast.success('Post criado! (sem imagem)');
      }
      
      // Recarrega sugestões
      loadSuggestions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar post');
    } finally {
      setGeneratingPost(null);
    }
  };

  const handleSeed = async () => {
    try {
      const result = await seedLandingPages();
      setSeedResult(result);
      toast.success(`Seed executado! ${result.created} LPs criadas.`);
      fetchLandingPages();
    } catch (err) {
      toast.error('Erro ao executar seed');
    }
  };

  const filteredPages = landingPages.filter(page => {
    if (selectedCategory !== 'all' && page.category !== selectedCategory) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        page.title.toLowerCase().includes(search) ||
        page.headline.toLowerCase().includes(search) ||
        page.keywords.some(k => k.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Ordena: prioridade alta primeiro, depois menos usadas
  const sortedPages = [...filteredPages].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.postCount - b.postCount;
  });

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Globe className="w-4 h-4" />
              <span className="text-xs font-medium">Total LPs</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Conversão Média</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.averageConversion}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Link2 className="w-4 h-4" />
              <span className="text-xs font-medium">Views Totais</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.totalViews.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-medium">Leads</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.totalLeads.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* LP do Dia */}
      {dailyPages && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Landing Pages do Dia</h3>
            <span className="text-xs text-gray-500 ml-auto">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(dailyPages).map(([category, page]) => {
              if (!page) return null;
              const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]
                ?? { label: category, color: 'gray', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' };
              return (
                <div 
                  key={category} 
                  className={`${config.bg} ${config.border} border rounded-lg p-3 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 bg-white/70 rounded-full">
                      {config.label}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">{page.headline}</p>
                  <p className="text-xs text-gray-500 mb-2">/{page.slug}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyLink(page.slug)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copiar
                    </button>
                    <button
                      onClick={() => handleCreatePost(page)}
                      disabled={generatingPost === page.slug}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {generatingPost === page.slug ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      Post
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sugestões para Posts */}
      {suggestedPages.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900">Sugeridas para Post</h3>
            <span className="text-xs text-gray-500">(menos usadas recentemente)</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {suggestedPages.map(page => {
              const config = CATEGORY_CONFIG[page.category as keyof typeof CATEGORY_CONFIG]
                ?? { label: page.category, color: 'gray', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' };
              return (
                <button
                  key={page.slug}
                  onClick={() => handleCreatePost(page)}
                  disabled={generatingPost === page.slug}
                  className={`flex items-center gap-2 px-3 py-2 ${config.bg} ${config.border} border rounded-lg hover:shadow-sm transition-all disabled:opacity-50`}
                >
                  <span className="text-xs">{config.label.split(' ')[0]}</span>
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{page.title}</span>
                  <span className="text-xs text-gray-400">({page.postCount}x)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">📂 Todas Categorias</option>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Buscar landing page..."
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        
        <button
          onClick={() => setShowSeedModal(true)}
          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
        >
          🌱 Seed
        </button>
        
        <button
          onClick={() => { fetchLandingPages(); fetchDailyPages(); }}
          disabled={loading}
          className="px-4 py-2 text-sm text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 inline mr-1 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Lista de LPs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Landing Page</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Uso</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedPages.map(page => {
                const config = CATEGORY_CONFIG[page.category as keyof typeof CATEGORY_CONFIG]
                  ?? { label: page.category, color: 'gray', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' };
                return (
                  <tr key={page.slug} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{page.headline}</p>
                          <p className="text-xs text-gray-500 mt-0.5">/{page.slug}</p>
                          {page.seo?.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{page.seo.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text} ${config.border} border`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-medium text-gray-900">{page.postCount}</span>
                        <span className="text-xs text-gray-400">posts</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleCopyLink(page.slug)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Copiar link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <a
                          href={`https://clinicafonoinova.com.br/lp/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver LP"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleCreatePost(page)}
                          disabled={generatingPost === page.slug}
                          className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Gerar post"
                        >
                          {generatingPost === page.slug ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {sortedPages.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma landing page encontrada</p>
            <button
              onClick={() => setShowSeedModal(true)}
              className="mt-4 px-4 py-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
            >
              🌱 Executar Seed
            </button>
          </div>
        )}
      </div>

      {/* Cron Status Card */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">🤖 Automação de Posts</h3>
              <p className="text-sm text-gray-600">
                {cronStatus?.scheduled 
                  ? 'Cron ativo - roda todo dia às 7h' 
                  : 'Cron não agendado'}
              </p>
            </div>
          </div>
          <button
            onClick={handleRunCronNow}
            disabled={runningCron}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {runningCron ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {runningCron ? 'Executando...' : 'Executar Agora'}
          </button>
        </div>
        
        {cronStatus?.nextRuns && (
          <div className="mt-4 pt-4 border-t border-emerald-200">
            <p className="text-xs font-medium text-gray-600 mb-2">Próximos horários de postagem:</p>
            <div className="flex flex-wrap gap-2">
              {cronStatus.nextRuns.slice(0, 4).map((run, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-1 text-xs bg-white border border-emerald-200 rounded-full text-emerald-700"
                >
                  {run.label}: {new Date(run.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <p className="mt-3 text-xs text-emerald-700">
          💡 A automação cria posts no GMB para as landing pages do dia em horários estratégicos
        </p>
      </div>

      {/* Modal Seed */}
      {showSeedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSeedModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🌱 Seed de Landing Pages</h3>
            <p className="text-sm text-gray-600 mb-4">
              Isso vai criar as 20+ landing pages recomendadas no banco de dados. 
              Páginas já existentes serão mantidas.
            </p>
            
            {seedResult ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-700">
                  ✅ <strong>{seedResult.created}</strong> criadas
                </p>
                <p className="text-sm text-green-700">
                  ⏭️ <strong>{seedResult.skipped}</strong> já existiam
                </p>
                <p className="text-sm text-green-700">
                  📊 Total: <strong>{seedResult.total}</strong>
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">Landing pages que serão criadas:</p>
                <ul className="mt-2 space-y-1 text-xs text-gray-500">
                  <li>• 8 LPs de Fonoaudiologia</li>
                  <li>• 5 LPs de Autismo</li>
                  <li>• 2 LPs de Psicologia</li>
                  <li>• 3 LPs de Aprendizagem</li>
                  <li>• 1 LP de Terapia Ocupacional</li>
                  <li>• 3 LPs Geográficas</li>
                </ul>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSeedModal(false)}
                className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Fechar
              </button>
              {!seedResult && (
                <button
                  onClick={handleSeed}
                  className="flex-1 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Executar Seed
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
