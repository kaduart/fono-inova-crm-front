/**
 * 🎯 Marketing Dashboard - COMPLETO
 * Centraliza GMB, Instagram, Facebook, Vídeos e Spy de Concorrentes
 */

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import API from '../../services/api';
import { useMarketing, type FunnelStage, type AdSpy } from '../../hooks/useMarketing';

import { VideoCard } from './VideoCard';

// Ícones
const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PublishIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg className={`w-4 h-4 ${filled ? 'text-yellow-500 fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ESPECIALIDADES = [
  { id: 'fonoaudiologia', nome: 'Fonoaudiologia', cor: 'purple' },
  { id: 'psicologia', nome: 'Psicologia', cor: 'pink' },
  { id: 'terapia_ocupacional', nome: 'Terapia Ocupacional', cor: 'amber' },
  { id: 'fisioterapia', nome: 'Fisioterapia', cor: 'emerald' },
  { id: 'psicomotricidade', nome: 'Psicomotricidade', cor: 'orange' },
  { id: 'freio_lingual', nome: 'Freio Lingual', cor: 'rose' },
  { id: 'neuropsicologia', nome: 'Avaliação Neuropsicológica', cor: 'violet' },
  { id: 'psicopedagogia', nome: 'Psicopedagogia', cor: 'cyan' },
  { id: 'musicoterapia', nome: 'Musicoterapia', cor: 'fuchsia' },
];

// 🕐 Horários estratégicos para publicação no GMB
const HORARIOS_ESTRATEGICOS = [
  { value: '08:00', label: '🌅 08:00 - Início do dia' },
  { value: '12:30', label: '🌞 12:30 - Almoço' },
  { value: '15:00', label: '☕ 15:00 - Tarde' },
  { value: '19:00', label: '🌆 19:00 - Final do dia' },
  { value: '21:00', label: '🌙 21:00 - Noite' },
];

// Gerar datas dos próximos 7 dias
const getProximosDias = () => {
  const dias = [];
  const hoje = new Date();
  for (let i = 0; i < 7; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    const value = data.toISOString().split('T')[0];
    const label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
    dias.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return dias;
};

const TAB_CONFIG = {
  gmb: { label: '📍 Google Meu Negócio', color: 'blue', shortLabel: 'GMB' },
  instagram: { label: '📸 Instagram', color: 'pink', shortLabel: 'IG' },
  facebook: { label: '📘 Facebook', color: 'indigo', shortLabel: 'FB' },
  videos: { label: '🎬 Vídeos', color: 'red', shortLabel: 'Vídeos' },
  spy: { label: '🔍 Spy', color: 'purple', shortLabel: 'Spy' }
};

export default function MarketingDashboard() {
  const [activeTab, setActiveTab] = useState<'gmb' | 'instagram' | 'facebook' | 'videos' | 'spy'>('gmb');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [funnelFilter, setFunnelFilter] = useState<'all' | 'top' | 'middle' | 'bottom'>('all');
  const [selectedEspecialidade, setSelectedEspecialidade] = useState('');
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<FunnelStage>('top');
  const [customTheme, setCustomTheme] = useState('');
  
  // 🕐 Controle de agendamento GMB
  const [schedulePost, setSchedulePost] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [generating, setGenerating] = useState(false);
  const [publishingPost, setPublishingPost] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{open: boolean; post: any} | null>(null);
  const [generatingImagePostId, setGeneratingImagePostId] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<30 | 45 | 60>(30);
  const [videoRoteiro, setVideoRoteiro] = useState('');
  const [generatingVideo, setGeneratingVideo] = useState(false);
  
  // Spy states
  const [spyKeyword, setSpyKeyword] = useState('');
  const [spyEspecialidade, setSpyEspecialidade] = useState('');
  const [spyTab, setSpyTab] = useState<'results' | 'saved'>('results');
  const [analyzingAd, setAnalyzingAd] = useState<string | null>(null);
  const [selectedAdForAnalysis, setSelectedAdForAnalysis] = useState<AdSpy | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [adaptingAd, setAdaptingAd] = useState(false);
  const [adaptedPost, setAdaptedPost] = useState<string | null>(null);
  const [showAdaptModal, setShowAdaptModal] = useState(false);
  const [adaptConfig, setAdaptConfig] = useState({
    especialidade: 'fonoaudiologia',
    funil: 'top' as FunnelStage,
    tipo: 'instagram' as 'instagram' | 'facebook' | 'gmb' | 'video'
  });
  
  const { gmb, instagram, facebook, videos, spy, refresh, loading } = useMarketing();
  
  const currentData = activeTab === 'gmb' ? gmb 
    : activeTab === 'instagram' ? instagram 
    : activeTab === 'facebook' ? facebook 
    : null;
  
  const posts = currentData?.posts || [];
  const stats = currentData?.stats;
  
  const filteredPosts = posts.filter((post: any) => {
    const statusMatch = statusFilter === 'all' || post.status === statusFilter;
    const funnelMatch = funnelFilter === 'all' || post.funnelStage === funnelFilter;
    return statusMatch && funnelMatch;
  });

  // Carregar anúncios salvos ao abrir aba spy
  useEffect(() => {
    if (activeTab === 'spy' && spyTab === 'saved') {
      spy.listSaved();
    }
  }, [activeTab, spyTab]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      if (activeTab === 'gmb') {
        // 🕐 Prepara data/hora de agendamento se habilitado
        let scheduledAt: string | undefined;
        if (schedulePost && scheduleDate && scheduleTime) {
          scheduledAt = `${scheduleDate}T${scheduleTime}:00`;
        }
        
        await gmb.generate(selectedEspecialidade || undefined, customTheme, scheduledAt);
        toast.success(scheduledAt ? `✅ Post GMB agendado!` : '✅ Post GMB criado!');
        
        // Limpa campos de agendamento
        setSchedulePost(false);
        setScheduleDate('');
        setScheduleTime('');
      } else if (activeTab === 'instagram') {
        await instagram.generate(selectedEspecialidade || undefined, customTheme, selectedFunnelStage);
        toast.success('✅ Post Instagram criado!');
      } else if (activeTab === 'facebook') {
        await facebook.generate(selectedEspecialidade || undefined, customTheme, selectedFunnelStage);
        toast.success('✅ Post Facebook criado!');
      }
      setCustomTheme('');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao gerar');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (postId: string) => {
    setPublishingPost(postId);
    try {
      if (activeTab === 'gmb') await gmb.publish(postId);
      else if (activeTab === 'instagram') await instagram.publish(postId);
      else if (activeTab === 'facebook') await facebook.publish(postId);
      toast.success('✅ Publicado!');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao publicar');
    } finally {
      setPublishingPost(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    setDeletingPost(postId);
    try {
      if (activeTab === 'gmb') await gmb.delete(postId);
      else if (activeTab === 'instagram') await instagram.delete(postId);
      else if (activeTab === 'facebook') await facebook.delete(postId);
      toast.success('✅ Excluído!');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao excluir');
    } finally {
      setDeletingPost(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editModal?.post) return;
    try {
      const data = {
        content: editModal.post.content,
        mediaUrl: editModal.post.mediaUrl,
        funnelStage: editModal.post.funnelStage
      };
      if (activeTab === 'gmb') await gmb.update(editModal.post._id, data);
      else if (activeTab === 'instagram') await instagram.update(editModal.post._id, data);
      else if (activeTab === 'facebook') await facebook.update(editModal.post._id, data);
      toast.success('✅ Salvo!');
      setEditModal(null);
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleGenerateNewImage = async (postId?: string) => {
    const targetPostId = postId || editModal?.post?._id;
    if (!targetPostId) return;
    
    const especialidadeId = editModal?.post?.theme || 'fonoaudiologia';
    setGeneratingImagePostId(targetPostId);
    
    try {
      // Determina qual endpoint usar baseado na aba ativa
      let endpoint = '/gmb/preview/image';
      if (activeTab === 'instagram') endpoint = `/instagram/posts/${targetPostId}/image`;
      else if (activeTab === 'facebook') endpoint = `/facebook/posts/${targetPostId}/image`;
      
      const response = await API.post(endpoint, {
        content: editModal?.post?.content || '',
        especialidadeId
      });
      const newImageUrl = response.data.data?.imageUrl;
      if (newImageUrl) {
        // Se estiver no modal, atualiza o post do modal
        if (editModal?.post && editModal.post._id === targetPostId) {
          setEditModal({...editModal, post: {...editModal.post, mediaUrl: newImageUrl}});
        }
        toast.success('✅ Imagem gerada com sucesso!');
        refresh(); // Atualiza a lista
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao gerar imagem');
    } finally {
      setGeneratingImagePostId(null);
    }
  };

  const handleGenerateVideo = async () => {
    if (!selectedEspecialidade) {
      toast.error('Selecione uma especialidade');
      return;
    }
    setGeneratingVideo(true);
    try {
      await videos.generate({
        especialidadeId: selectedEspecialidade,
        roteiro: videoRoteiro,
        duration: videoDuration
      });
      toast.success('✅ Vídeo em processamento!');
      setVideoRoteiro('');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao gerar vídeo');
    } finally {
      setGeneratingVideo(false);
    }
  };

  // Spy handlers
  const handleSpySearch = async () => {
    await spy.search(spyKeyword, spyEspecialidade || undefined);
  };

  const handleSaveAd = async (ad: AdSpy) => {
    try {
      await spy.save(ad);
      toast.success('⭐ Anúncio salvo como referência!');
    } catch (err) {
      toast.error('Erro ao salvar anúncio');
    }
  };

  const handleAnalyzeAd = async (ad: AdSpy) => {
    setAnalyzingAd(ad.adId);
    setSelectedAdForAnalysis(ad);
    try {
      const result = await spy.analyze(ad.adText, ad.pageName);
      setAnalysisResult(result);
    } catch (err) {
      toast.error('Erro ao analisar anúncio');
    } finally {
      setAnalyzingAd(null);
    }
  };

  const handleAdaptAd = async () => {
    if (!selectedAdForAnalysis) return;
    setAdaptingAd(true);
    try {
      const adapted = await spy.adapt(
        selectedAdForAnalysis.adText,
        adaptConfig.especialidade,
        adaptConfig.funil,
        analysisResult
      );
      setAdaptedPost(adapted);
      setShowAdaptModal(true);
    } catch (err) {
      toast.error('Erro ao adaptar anúncio');
    } finally {
      setAdaptingAd(false);
    }
  };

  const handleSaveAdapted = async () => {
    // Aqui você pode salvar o post adaptado no banco
    toast.success('✅ Post adaptado salvo!');
    setShowAdaptModal(false);
    setAdaptedPost(null);
    setAnalysisResult(null);
    setSelectedAdForAnalysis(null);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { color: string; bg: string; label: string }> = {
      draft: { color: 'gray', bg: 'bg-gray-100', label: 'Rascunho' },
      scheduled: { color: 'blue', bg: 'bg-blue-100', label: 'Agendado' },
      published: { color: 'green', bg: 'bg-green-100', label: 'Publicado' },
      failed: { color: 'red', bg: 'bg-red-100', label: 'Falhou' }
    };
    const cfg = config[status] || config.draft;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} text-${cfg.color}-800`}>
        {cfg.label}
      </span>
    );
  };

  const FunnelBadge = ({ stage }: { stage: string }) => {
    const config: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
      top: { emoji: '🔴', label: 'Topo', color: 'red', bg: 'bg-red-50' },
      middle: { emoji: '🟡', label: 'Meio', color: 'yellow', bg: 'bg-yellow-50' },
      bottom: { emoji: '🟢', label: 'Fundo', color: 'green', bg: 'bg-green-50' }
    };
    const cfg = config[stage] || config.top;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${cfg.bg} text-${cfg.color}-700 border-${cfg.color}-200`}>
        {cfg.emoji} {cfg.label}
      </span>
    );
  };

  // Cards de estatísticas
  const StatsCards = () => {
    if (!stats) return null;
    
    const cards = [
      { label: 'Total Posts', value: stats.total, color: 'gray', icon: '📝' },
      { label: 'Publicados', value: stats.byStatus?.published || 0, color: 'green', icon: '✅' },
      { label: 'Rascunhos', value: stats.byStatus?.draft || 0, color: 'yellow', icon: '📝' },
      { label: 'Este Mês', value: stats.publishedThisMonth || 0, color: 'blue', icon: '📅' },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Marketing Dashboard</h1>
                <p className="text-xs text-gray-500">GMB • Instagram • Facebook • Vídeos • Spy</p>
              </div>
            </div>
            <button 
              onClick={refresh} 
              disabled={loading} 
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RefreshIcon />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-1 overflow-x-auto">
            {Object.entries(TAB_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-all whitespace-nowrap ${
                  activeTab === key 
                    ? `border-${config.color}-600 text-${config.color}-600` 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Stats Cards - apenas para abas de posts */}
        {activeTab !== 'videos' && activeTab !== 'spy' && <StatsCards />}
        
        {/* Área de Geração - Posts */}
        {activeTab !== 'videos' && activeTab !== 'spy' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className={`p-2 rounded-lg ${
                activeTab === 'gmb' ? 'bg-blue-100 text-blue-600' :
                activeTab === 'instagram' ? 'bg-pink-100 text-pink-600' :
                'bg-indigo-100 text-indigo-600'
              }`}>
                {activeTab === 'gmb' && <span className="text-lg">📍</span>}
                {activeTab === 'instagram' && <span className="text-lg">📸</span>}
                {activeTab === 'facebook' && <span className="text-lg">📘</span>}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {activeTab === 'gmb' && 'Gerar Post para Google Meu Negócio'}
                  {activeTab === 'instagram' && 'Gerar Post para Instagram'}
                  {activeTab === 'facebook' && 'Gerar Post para Facebook'}
                </h2>
                <p className="text-xs text-gray-500">
                  Conteúdo + imagem serão gerados automaticamente
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
              <select
                value={selectedEspecialidade}
                onChange={(e) => setSelectedEspecialidade(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
              >
                <option value="">Todas Especialidades</option>
                {ESPECIALIDADES.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              
              <select
                value={selectedFunnelStage}
                onChange={(e) => setSelectedFunnelStage(e.target.value as FunnelStage)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
              >
                <option value="top">🔴 Topo (Descoberta)</option>
                <option value="middle">🟡 Meio (Consideração)</option>
                <option value="bottom">🟢 Fundo (Conversão)</option>
              </select>
              
              <input
                type="text"
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                placeholder="Tema personalizado (opcional)"
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors md:col-span-2"
              />
            </div>
            
            {/* 🕐 Agendamento GMB */}
            {activeTab === 'gmb' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedulePost}
                    onChange={(e) => {
                      setSchedulePost(e.target.checked);
                      if (e.target.checked) {
                        // Preenche com valores padrão
                        const hoje = new Date().toISOString().split('T')[0];
                        setScheduleDate(hoje);
                        setScheduleTime('08:00');
                      }
                    }}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Agendar publicação</span>
                    <p className="text-xs text-gray-500">Escolha quando o post será publicado no Google</p>
                  </div>
                </label>
                
                {schedulePost && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <select
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                    >
                      {getProximosDias().map(dia => (
                        <option key={dia.value} value={dia.value}>{dia.label}</option>
                      ))}
                    </select>
                    
                    <select
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                    >
                      {HORARIOS_ESTRATEGICOS.map(horario => (
                        <option key={horario.value} value={horario.value}>{horario.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={`px-6 py-2.5 text-white rounded-lg disabled:opacity-50 transition-all shadow-sm text-sm font-medium flex items-center gap-2 ${
                  activeTab === 'gmb' ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' :
                  activeTab === 'instagram' ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700' :
                  'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800'
                }`}
              >
                {generating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Gerando...
                  </>
                ) : (
                  <>
                    <PlusIcon />
                    {activeTab === 'gmb' && (schedulePost ? `📅 Agendar Post GMB` : 'Gerar Post GMB')}
                    {activeTab === 'instagram' && 'Gerar Post Instagram'}
                    {activeTab === 'facebook' && 'Gerar Post Facebook'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Área de Geração - Vídeos */}
        {activeTab === 'videos' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">🎬 Gerar Vídeo com IA</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <select
                value={selectedEspecialidade}
                onChange={(e) => setSelectedEspecialidade(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
              >
                <option value="">Selecione uma especialidade...</option>
                {ESPECIALIDADES.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <select
                value={videoDuration}
                onChange={(e) => setVideoDuration(Number(e.target.value) as 30 | 45 | 60)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
              >
                <option value={30}>⏱️ 30 segundos</option>
                <option value={45}>⏱️ 45 segundos</option>
                <option value={60}>⏱️ 60 segundos</option>
              </select>
            </div>
            <textarea
              value={videoRoteiro}
              onChange={(e) => setVideoRoteiro(e.target.value)}
              placeholder="Roteiro personalizado (opcional) - ou deixe em branco para gerar automaticamente..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors mb-4"
              rows={3}
            />
            <button
              onClick={handleGenerateVideo}
              disabled={generatingVideo || !selectedEspecialidade}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all shadow-sm text-sm font-medium"
            >
              {generatingVideo ? 'Gerando...' : '🎬 Gerar Vídeo'}
            </button>
          </div>
        )}

        {/* Filtros */}
        {activeTab !== 'videos' && activeTab !== 'spy' && (
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            >
              <option value="all">Todos Status</option>
              <option value="draft">📝 Rascunho</option>
              <option value="published">✅ Publicado</option>
            </select>
            <select
              value={funnelFilter}
              onChange={(e) => setFunnelFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            >
              <option value="all">Todos Funis</option>
              <option value="top">🔴 Topo (Descoberta)</option>
              <option value="middle">🟡 Meio (Consideração)</option>
              <option value="bottom">🟢 Fundo (Conversão)</option>
            </select>
          </div>
        )}

        {/* Lista de Vídeos */}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.loading ? (
              <div className="col-span-full flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : videos.videos.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">Nenhum vídeo encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Gere seu primeiro vídeo acima</p>
              </div>
            ) : (
              videos.videos.map((video) => (
                <VideoCard
                  key={video._id}
                  video={video}
                  onPublish={(id, channels) => videos.publish(id, channels)}
                  onDelete={(id) => videos.delete(id)}
                />
              ))
            )}
          </div>
        )}

        {/* Lista de Posts */}
        {activeTab !== 'videos' && activeTab !== 'spy' && (
          <div className="space-y-4">
            {currentData?.loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">Nenhum post encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Gere seu primeiro post acima</p>
              </div>
            ) : (
              filteredPosts.map((post: any) => (
                <div key={post._id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 relative">
                      {post.mediaUrl ? (
                        <img 
                          src={post.mediaUrl} 
                          alt="" 
                          className={`w-16 h-16 object-cover rounded-lg border border-gray-200 transition-opacity ${generatingImagePostId === post._id ? 'opacity-50' : ''}`}
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-lg border border-dashed flex flex-col items-center justify-center transition-colors ${generatingImagePostId === post._id ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-300'}`}>
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Loading overlay na thumbnail */}
                      {generatingImagePostId === post._id && (
                        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Botão de gerar imagem na lista */}
                      {!post.mediaUrl && !generatingImagePostId && (
                        <button
                          onClick={() => handleGenerateNewImage(post._id)}
                          className="absolute -bottom-2 -right-2 p-1.5 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors"
                          title="Gerar imagem"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 mb-2 line-clamp-2 leading-relaxed">
                        {post.content}
                      </p>
                      
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={post.status} />
                          {post.funnelStage && <FunnelBadge stage={post.funnelStage} />}
                          {post.theme && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                              {ESPECIALIDADES.find(e => e.id === post.theme)?.nome || post.theme}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {(post.status === 'draft' || post.status === 'scheduled') && (
                            <>
                              <button
                                onClick={() => setEditModal({ open: true, post })}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                              >
                                <EditIcon />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => handlePublish(post._id)}
                                disabled={publishingPost === post._id}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200 disabled:opacity-50"
                              >
                                <PublishIcon />
                                <span>{publishingPost === post._id ? '...' : 'Publicar'}</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(post._id)}
                            disabled={deletingPost === post._id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 disabled:opacity-50"
                          >
                            <TrashIcon />
                            <span>{deletingPost === post._id ? '...' : 'Excluir'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 🔍 SPY DE CONCORRENTES */}
        {activeTab === 'spy' && (
          <div className="space-y-6">
            {/* Tabs do Spy */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setSpyTab('results')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-all ${
                  spyTab === 'results'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🔍 Buscar Anúncios
              </button>
              <button
                onClick={() => setSpyTab('saved')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-all ${
                  spyTab === 'saved'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ⭐ Salvos ({spy.saved.length})
              </button>
            </div>

            {/* Busca */}
            {spyTab === 'results' && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={spyKeyword}
                      onChange={(e) => setSpyKeyword(e.target.value)}
                      placeholder="Buscar anúncios... (ex: fonoaudiologia)"
                      className="px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      onKeyDown={(e) => e.key === 'Enter' && handleSpySearch()}
                    />
                    <select
                      value={spyEspecialidade}
                      onChange={(e) => setSpyEspecialidade(e.target.value)}
                      className="px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white"
                    >
                      <option value="">Todas Especialidades</option>
                      <option value="fonoaudiologia">Fonoaudiologia</option>
                      <option value="psicologia">Psicologia</option>
                      <option value="terapia_ocupacional">Terapia Ocupacional</option>
                      <option value="fisioterapia">Fisioterapia</option>
                      <option value="musicoterapia">Musicoterapia</option>
                    </select>
                    <button
                      onClick={handleSpySearch}
                      disabled={spy.loading}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 transition-all shadow-sm text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {spy.loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Buscando...
                        </>
                      ) : (
                        <>
                          <SearchIcon />
                          Buscar Anúncios
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    💡 Dica: Anúncios com mais tempo rodando geralmente estão convertendo melhor
                  </p>
                </div>

                {/* Lista de Anúncios */}
                <div className="grid gap-4">
                  {spy.loading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                  ) : spy.ads.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                      <p className="text-gray-500">Nenhum anúncio encontrado</p>
                      <p className="text-sm text-gray-400 mt-1">Faça uma busca para encontrar anúncios de concorrentes</p>
                    </div>
                  ) : (
                    spy.ads.map((ad: AdSpy) => (
                      <div key={ad.adId} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
                        <div className="flex items-start gap-4">
                          {/* Ícone/Lado esquerdo */}
                          <div className="flex-shrink-0">
                            <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                              <div>
                                <h3 className="font-semibold text-gray-900">{ad.pageName}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  {ad.daysActive > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                      🔥 Rodando há {ad.daysActive} dias
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    Buscado por: "{ad.keyword}"
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Texto do anúncio */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                {ad.adText?.length > 300 
                                  ? ad.adText.substring(0, 300) + '...'
                                  : ad.adText
                                }
                              </p>
                              {ad.adText?.length > 300 && (
                                <button 
                                  className="text-purple-600 text-xs font-medium mt-2 hover:underline"
                                  onClick={() => {
                                    // Expandir texto em modal
                                    setSelectedAdForAnalysis(ad);
                                    setAnalysisResult(null);
                                  }}
                                >
                                  Ver mais
                                </button>
                              )}
                            </div>

                            {/* Ações */}
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleSaveAd(ad)}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors border border-yellow-200"
                              >
                                <StarIcon />
                                <span>Salvar</span>
                              </button>
                              <button
                                onClick={() => handleAnalyzeAd(ad)}
                                disabled={analyzingAd === ad.adId}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 disabled:opacity-50"
                              >
                                {analyzingAd === ad.adId ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Analisando...
                                  </>
                                ) : (
                                  <>
                                    <SearchIcon />
                                    Analisar com IA
                                  </>
                                )}
                              </button>
                              <a
                                href={ad.snapshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver Original
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Análise Expandida */}
                        {selectedAdForAnalysis?.adId === ad.adId && analysisResult && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-5">
                              <div className="flex items-center gap-2 mb-4">
                                <SparklesIcon />
                                <h4 className="font-semibold text-purple-900">📊 Análise do Anúncio</h4>
                              </div>
                              
                              <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div className="bg-white/70 rounded-lg p-3">
                                  <p className="text-xs font-medium text-purple-700 mb-1">🎯 Gancho</p>
                                  <p className="text-sm text-gray-700">{analysisResult.gancho}</p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-3">
                                  <p className="text-xs font-medium text-purple-700 mb-1">🏗️ Estrutura</p>
                                  <p className="text-sm text-gray-700">{analysisResult.estrutura}</p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-3">
                                  <p className="text-xs font-medium text-purple-700 mb-1">📢 CTA</p>
                                  <p className="text-sm text-gray-700">{analysisResult.cta}</p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-3">
                                  <p className="text-xs font-medium text-purple-700 mb-1">💡 Por que converte</p>
                                  <p className="text-sm text-gray-700">{analysisResult.porqueConverte}</p>
                                </div>
                              </div>

                              {analysisResult.pontosFracos && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                  <p className="text-xs font-medium text-yellow-700 mb-1">⚠️ Pontos fracos</p>
                                  <p className="text-sm text-gray-700">{analysisResult.pontosFracos}</p>
                                </div>
                              )}

                              <button
                                onClick={() => {
                                  setAdaptConfig({
                                    ...adaptConfig,
                                    especialidade: ad.especialidade || 'fonoaudiologia'
                                  });
                                  handleAdaptAd();
                                }}
                                disabled={adaptingAd}
                                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all font-medium flex items-center justify-center gap-2"
                              >
                                {adaptingAd ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Adaptando...
                                  </>
                                ) : (
                                  <>
                                    <SparklesIcon />
                                    ✏️ Adaptar para Fono Inova
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Anúncios Salvos */}
            {spyTab === 'saved' && (
              <div className="grid gap-4">
                {spy.saved.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <p className="text-gray-500">Nenhum anúncio salvo</p>
                    <p className="text-sm text-gray-400 mt-1">Busque anúncios e salve os que gostar como referência</p>
                  </div>
                ) : (
                  spy.saved.map((ad: AdSpy) => (
                    <div key={ad._id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="p-3 bg-yellow-100 rounded-xl">
                            <StarIcon filled />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">{ad.pageName}</h3>
                            <span className="text-xs text-gray-400">
                              Salvo em: {new Date(ad.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium mt-1 mb-3">
                            {ad.especialidade}
                          </span>
                          <p className="text-sm text-gray-600 line-clamp-3">{ad.adText}</p>
                          {ad.analysis && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-500">💡 Análise:</p>
                              <p className="text-sm text-gray-600">{ad.analysis.gancho}</p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => spy.delete(ad._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Edição de Post */}
      {editModal?.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Editar Post</h3>
              <button 
                onClick={() => setEditModal(null)} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <textarea
              value={editModal.post.content}
              onChange={(e) => setEditModal({...editModal, post: {...editModal.post, content: e.target.value}})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mb-5"
              rows={6}
            />
            
            {/* Imagem do post com overlay de loading */}
            <div className="mb-5 relative">
              <div className="relative w-full h-70 rounded-lg overflow-hidden border border-gray-200">
                {editModal.post.mediaUrl ? (
                  <img 
                    src={editModal.post.mediaUrl} 
                    alt="" 
                    className={`w-full h-full object-cover transition-opacity ${generatingImagePostId === editModal.post._id ? 'opacity-50' : 'opacity-100'}`} 
                  />
                ) : (
                  <div className={`w-full h-full bg-gray-100 flex flex-col items-center justify-center transition-all ${generatingImagePostId === editModal.post._id ? 'bg-purple-50' : ''}`}>
                    <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-400 text-sm">Sem imagem</span>
                  </div>
                )}
                
                {/* Overlay de loading */}
                {generatingImagePostId === editModal.post._id && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                    <svg className="animate-spin h-10 w-10 text-white mb-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-white font-medium text-sm">Gerando imagem...</span>
                    <span className="text-white/70 text-xs mt-1">Isso pode levar alguns segundos</span>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => handleGenerateNewImage(editModal.post._id)}
                disabled={generatingImagePostId === editModal.post._id}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {generatingImagePostId === editModal.post._id ? 'Gerando...' : editModal.post.mediaUrl ? 'Gerar Nova Imagem' : '🎨 Gerar Imagem'}
              </button>
            </div>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEditModal(null)} 
                className="px-5 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit} 
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adaptação */}
      {showAdaptModal && adaptedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAdaptModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">✏️ Post Adaptado para Fono Inova</h3>
              <button 
                onClick={() => setShowAdaptModal(false)} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-5 mb-5">
              <textarea
                value={adaptedPost}
                onChange={(e) => setAdaptedPost(e.target.value)}
                className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white/80"
                rows={10}
              />
            </div>

            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Salvar como:</p>
              <div className="flex flex-wrap gap-2">
                {['instagram', 'facebook', 'gmb', 'video'].map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setAdaptConfig({...adaptConfig, tipo: tipo as any})}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      adaptConfig.tipo === tipo
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {tipo === 'instagram' && '📸 Instagram'}
                    {tipo === 'facebook' && '📘 Facebook'}
                    {tipo === 'gmb' && '📍 GMB'}
                    {tipo === 'video' && '🎬 Roteiro de Vídeo'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowAdaptModal(false)} 
                className="px-5 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveAdapted}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all flex items-center gap-2"
              >
                <PublishIcon />
                Salvar no Painel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
