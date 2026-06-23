/**
 * 📍 Dashboard do Google Meu Negócio (GMB)
 * Publicação automática via Make (Integromat)
 */

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useGmb } from '../../hooks/useGmb';
import API from '../../services/api';
import { trackGmbPostView, openGmbWhatsApp } from '../../services/gmbAbTracking';
import GmbAssistedPublishModal from './GmbAssistedPublishModal';
import GmbIntelligencePanel from './GmbIntelligencePanel';
import GmbConversionDashboard from './GmbConversionDashboard';

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

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const FreeIcon = () => (
  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

const RepublishIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const GmbDashboard = () => {
  const { posts, stats, loading, error, refresh } = useGmb();
  const [makeStatus, setMakeStatus] = useState<{ configured: boolean } | null>(null);
  const [previewModal, setPreviewModal] = useState<{
    open: boolean;
    content: string;
    title: string;
    imageUrl?: string;
    postId?: string;
    metadata?: any;
  } | null>(null);
  const [editModal, setEditModal] = useState<{
    open: boolean;
    post: any;
  } | null>(null);
  const [assistedModal, setAssistedModal] = useState<{
    open: boolean;
    post: any;
  } | null>(null);
  const [generatingCount, setGeneratingCount] = useState(0);
  const [creatingAssisted, setCreatingAssisted] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [republishingId, setRepublishingId] = useState<string | null>(null);
  const [publishingAll, setPublishingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regeneratingImageId, setRegeneratingImageId] = useState<string | null>(null);
  const [selectedEspecialidade, setSelectedEspecialidade] = useState<string>('');
  const [customTheme, setCustomTheme] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('daily');
  const [activeTab, setActiveTab] = useState<'posts' | 'inteligencia' | 'conversao'>('posts');

  useEffect(() => {
    API.get('/gmb/make/status')
      .then(r => setMakeStatus(r.data))
      .catch(() => setMakeStatus({ configured: false }));
  }, []);

  const especialidades = [
    { id: '', nome: 'Automático (rotação)' },
    { id: 'fonoaudiologia', nome: 'Fonoaudiologia' },
    { id: 'psicologia', nome: 'Psicologia' },
    { id: 'terapia_ocupacional', nome: 'Terapia Ocupacional' },
    { id: 'fisioterapia', nome: 'Fisioterapia' },
    { id: 'psicomotricidade', nome: 'Psicomotricidade' },
    { id: 'freio_lingual', nome: 'Freio Lingual' },
    { id: 'neuropsicologia', nome: 'Avaliação Neuropsicológica' },
    { id: 'psicopedagogia_clinica', nome: 'Psicopedagogia Clínica' },
    { id: 'psicopedagogia', nome: 'Psicopedagogia' },
    { id: 'musicoterapia', nome: 'Musicoterapia' },
  ];

  const handleGenerate = async () => {
    setGeneratingCount(c => c + 1);
    try {
      const response = await API.post('/gmb/admin/trigger-generation', {
        especialidadeId: selectedEspecialidade || undefined,
        customTheme: customTheme.trim() || undefined,
        generateImage: true
      });

      const especialidade = response.data.data?.especialidade?.nome;

      toast.success(
        <div>
          <div>✅ Post "{especialidade}" criado!</div>
          {customTheme && <div className="text-xs text-blue-600">Tema: "{customTheme}"</div>}
          <div className="text-xs text-green-600">💚 100% GRATUITO</div>
        </div>
      );

      setCustomTheme('');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao gerar post');
    } finally {
      setGeneratingCount(c => c - 1);
    }
  };

  const handleGenerateWeek = async () => {
    if (!confirm('Gerar posts para toda a semana?\n\n💚 Tudo gratuito!')) return;

    setGeneratingCount(c => c + 1);
    try {
      const response = await API.post('/gmb/admin/trigger-weekly');
      const count = response.data.data.filter((r: any) => r.success).length;
      toast.success(
        <div>
          <div>✅ {count} posts gerados!</div>
          <div className="text-xs text-green-600">💚 Tudo gratuito</div>
        </div>
      );
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao gerar semana');
      refresh(); // posts gerados parcialmente ainda aparecem
    } finally {
      setGeneratingCount(c => c - 1);
    }
  };

  // 🤖 Publisher Assistido
  const handleCreateAssisted = async () => {
    setCreatingAssisted(true);
    try {
      const response = await API.post('/gmb/assisted/create', {
        type: selectedType,
        especialidadeId: selectedEspecialidade || undefined,
        customTheme: customTheme.trim() || undefined,
        generateImage: true
      });
      
      const post = response.data.data.post;
      
      toast.success(
        <div>
          <div>✅ Post criado no modo assistido!</div>
          <div className="text-xs text-blue-600">Clique em "Publicar no Google"</div>
        </div>
      );
      
      refresh();
      
      // Abre modal automaticamente
      setAssistedModal({ open: true, post });
      
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar post assistido');
    } finally {
      setCreatingAssisted(false);
    }
  };

  const handleOpenAssistedModal = (post: any) => {
    setAssistedModal({ open: true, post });
  };

  const handlePublish = async (postId: string) => {
    setPublishingId(postId);
    try {
      await API.post(`/gmb/posts/${postId}/publish`);
      toast.success('✅ Post publicado no GMB!');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao publicar');
    } finally {
      setPublishingId(null);
    }
  };

  const handleRepublish = async (postId: string, postTitle: string) => {
    if (!confirm(`Reenviar o post "${postTitle || 'Sem título'}" ao Make para republicar no Google?`)) return;

    setRepublishingId(postId);
    try {
      await API.post(`/gmb/posts/${postId}/republish`);
      toast.success('✅ Post reenviado ao Make para republicação!');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao republicar');
    } finally {
      setRepublishingId(null);
    }
  };

  const [fixingImages, setFixingImages] = useState(false);

  const handleFixMissingImages = async () => {
    if (!confirm('Regenerar imagens dos posts sem imagem e publicar automaticamente?\n\nIsso pode levar alguns minutos.')) return;
    setFixingImages(true);
    try {
      const response = await API.post('/gmb/admin/fix-missing-images');
      const { resultados, message } = response.data;
      const publicados = resultados?.filter((r: any) => r.status === 'published').length ?? 0;
      const imagensOk = resultados?.filter((r: any) => r.status === 'image_ok_scheduled').length ?? 0;
      const erros = resultados?.filter((r: any) => ['error', 'image_failed'].includes(r.status)) ?? [];

      if (publicados > 0) toast.success(`✅ ${publicados} post(s) publicados!`);
      if (imagensOk > 0) toast.success(`🖼️ ${imagensOk} imagem(ns) regenerada(s) — aguardando horário`);
      erros.forEach((e: any) => toast.error(`❌ ${e.theme}: ${e.reason || 'falha na imagem'}`));
      if (publicados === 0 && imagensOk === 0 && erros.length === 0) toast.info(message);
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao regenerar imagens');
    } finally {
      setFixingImages(false);
    }
  };

  const handlePublishAllPending = async () => {
    if (!confirm('Forçar publicação de todos os posts agendados vencidos?\n\nIsso enviará os posts ao Make imediatamente.')) return;
    setPublishingAll(true);
    try {
      const response = await API.post('/gmb/admin/trigger-publish');
      const { resultados, message } = response.data;
      const publicados = resultados?.filter((r: any) => r.status === 'published').length ?? 0;
      const sem_imagem = resultados?.filter((r: any) => r.status === 'skipped').length ?? 0;
      const erros = resultados?.filter((r: any) => r.status === 'error') ?? [];

      if (publicados > 0) {
        toast.success(`✅ ${publicados} post(s) enviados ao Make!`);
      }
      if (sem_imagem > 0) {
        toast.warn(`⚠️ ${sem_imagem} post(s) pulados (sem imagem)`);
      }
      erros.forEach((e: any) => toast.error(`❌ ${e.theme}: ${e.reason}`));
      if (publicados === 0 && sem_imagem === 0 && erros.length === 0) {
        toast.info(response.data.message || 'Nenhum post pendente encontrado');
        if (response.data.diagnostico) {
          console.warn('[GMB] Diagnóstico:', response.data.diagnostico);
        }
      }
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao publicar');
    } finally {
      setPublishingAll(false);
    }
  };

  const handleDelete = async (postId: string, postTitle: string) => {
    if (!confirm(`Deletar o post "${postTitle || 'Sem título'}"?\n\nEsta ação não pode ser desfeita.`)) return;
    
    setDeletingId(postId);
    try {
      await API.delete(`/gmb/posts/${postId}`);
      toast.success('🗑️ Post deletado!');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao deletar');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (post: any) => {
    setEditModal({
      open: true,
      post: { ...post } // Cópia para edição
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal?.post) return;

    try {
      await API.put(`/gmb/posts/${editModal.post._id}`, {
        title: editModal.post.title,
        content: editModal.post.content,
        scheduledAt: editModal.post.scheduledAt
      });

      toast.success('✅ Post atualizado!');
      setEditModal(null);
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleRegenerateImage = async () => {
    if (!editModal?.post?._id) return;
    const postId = editModal.post._id;
    setRegeneratingImageId(postId);
    try {
      const response = await API.post(`/gmb/posts/${postId}/regenerate-image`);
      const newUrl = response.data.data?.mediaUrl;
      if (newUrl) {
        setEditModal(prev => prev ? { ...prev, post: { ...prev.post, mediaUrl: newUrl } } : prev);
        toast.success('✅ Nova imagem gerada!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao gerar imagem');
    } finally {
      setRegeneratingImageId(null);
    }
  };

  const handlePreview = (post: any) => {
    setPreviewModal({
      open: true,
      content: post.content,
      title: post.title,
      imageUrl: post.mediaUrl,
      postId: post._id,
      metadata: post.metadata
    });
    // 🧪 Registra visualização do post A/B
    if (post._id) {
      trackGmbPostView(post._id);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      ready: 'bg-purple-100 text-purple-800',
      scheduled: 'bg-blue-100 text-blue-800',
      published: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-500'
    };
    
    const labels = {
      draft: 'Rascunho',
      ready: 'Pronto para Publicar',
      scheduled: 'Agendado',
      published: 'Publicado',
      failed: 'Falhou',
      cancelled: 'Cancelado'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-700 mb-2">
          <AlertIcon />
          <span className="font-medium">Erro ao carregar dados do GMB</span>
        </div>
        <p className="text-red-600 text-sm">{error}</p>
        <button 
          onClick={refresh}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">Google Meu Negócio</h2>
              {makeStatus !== null && (
                makeStatus.configured
                  ? <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">Make ✅ Automático</span>
                  : <span className="px-2 py-0.5 bg-orange-400 text-white text-xs font-bold rounded-full">Make ⚠️ Não configurado</span>
              )}
            </div>
            <p className="text-gray-600 text-sm">
              1 post por dia • Texto: GPT • Imagens: IA • Publicação: {makeStatus?.configured ? 'automática via Make' : 'manual (configure MAKE_WEBHOOK_URL)'}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <RefreshIcon />
            </button>
          </div>
        </div>

        {/* Formulário de geração */}
        <div className="mt-6 pt-6 border-t border-blue-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Especialidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Especialidade (Área)
              </label>
              <select
                value={selectedEspecialidade}
                onChange={(e) => setSelectedEspecialidade(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                {especialidades.map(esp => (
                  <option key={esp.id} value={esp.id}>{esp.nome}</option>
                ))}
              </select>
            </div>

            {/* Tema Personalizado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tema Personalizado <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                placeholder="Ex: bruxismo infantil, seletividade alimentar..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe vazio para tema automático da área selecionada
              </p>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <PlusIcon />
              {customTheme ? `Gerar sobre "${customTheme.substring(0, 20)}${customTheme.length > 20 ? '...' : ''}"` : 'Gerar Post'}
            </button>

            <button
              onClick={handleGenerateWeek}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <RefreshIcon />
              Gerar Semana
            </button>

            {makeStatus?.configured && (
              <button
                onClick={handlePublishAllPending}
                disabled={publishingAll}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-semibold"
                title="Força envio imediato de todos os posts agendados vencidos ao Make"
              >
                {publishingAll ? <span className="animate-spin">⏳</span> : '🚀'}
                {publishingAll ? 'Publicando...' : 'Publicar Pendentes'}
              </button>
            )}

            <button
              onClick={handleFixMissingImages}
              disabled={fixingImages}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold"
              title="Regenera imagens dos posts sem imagem e os publica"
            >
              {fixingImages ? <span className="animate-spin">⏳</span> : '🖼️'}
              {fixingImages ? 'Gerando imagens...' : 'Corrigir Sem Imagem'}
            </button>

            {/* 🤖 Botão de Publicação Assistida */}
            <button
              onClick={handleCreateAssisted}
              disabled={creatingAssisted}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 border-2 border-blue-400"
              title="Sistema gera, você publica no Google em 30 segundos"
            >
              {creatingAssisted ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  🤖 Publicação Assistida
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info do fluxo */}
        <div className="mt-4 pt-4 border-t border-blue-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <FreeIcon />
            <span><strong>Texto:</strong> GPT-3.5</span>
          </div>
          <div className="flex items-center gap-2">
            <FreeIcon />
            <span><strong>Imagem:</strong> IA (DALL-E / HuggingFace)</span>
          </div>
          <div className="flex items-center gap-2">
            {makeStatus?.configured
              ? <><FreeIcon /><span><strong>Publicação:</strong> Automática via Make</span></>
              : <><AlertIcon /><span className="text-orange-600"><strong>Make:</strong> Configure MAKE_WEBHOOK_URL</span></>
            }
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-gray-500 text-sm">Total de Posts</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-gray-500 text-sm">Publicados</div>
            <div className="text-2xl font-bold text-green-600">{stats.byStatus?.published || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-gray-500 text-sm">Agendados</div>
            <div className="text-2xl font-bold text-blue-600">{stats.byStatus?.scheduled || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-gray-500 text-sm">Este Mês</div>
            <div className="text-2xl font-bold text-purple-600">{stats.publishedThisMonth || 0}</div>
          </div>
        </div>
      )}

      {/* 🗂️ Sistema de Abas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'posts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Posts
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {stats?.total || 0}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('inteligencia')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'inteligencia'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="text-base">🧠</span>
            Inteligência
            <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
              IA
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('conversao')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'conversao'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="text-base">🎯</span>
            Conversão
            <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
              Métricas
            </span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6">
          {activeTab === 'posts' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Posts {loading && <span className="text-gray-400 text-sm font-normal">(carregando...)</span>}
                </h3>

                {loading ? (
                  <div className="p-8 space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse flex gap-4">
                        <div className="w-24 h-24 bg-gray-200 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4" />
                          <div className="h-3 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : posts.length === 0 && generatingCount === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-1">Nenhum post encontrado</p>
                    <p className="text-sm mb-4">Clique em "Gerar Post" para criar o primeiro.</p>
                    <div className="text-xs text-green-600">
                      💚 Tudo gratuito - sem custos de API!
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {/* Skeletons de gerações em andamento */}
                    {generatingCount > 0 && [...Array(generatingCount)].map((_, i) => (
                      <div key={`skel-${i}`} className="p-4 bg-green-50/40 animate-pulse">
                        <div className="flex gap-4 items-center">
                          <div className="w-24 h-24 flex-shrink-0 bg-green-100 rounded-lg flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-green-400/40 border-t-green-500 rounded-full animate-spin" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse" />
                              <span className="text-xs font-medium text-green-700">Gerando post + imagem...</span>
                            </div>
                            <div className="h-3 bg-green-100 rounded w-3/4" />
                            <div className="h-3 bg-green-100 rounded w-1/2" />
                            <div className="h-3 bg-green-100 rounded w-2/3" />
                          </div>
                        </div>
                      </div>
                    ))}
                    {console.log('[GMB DEBUG] Total posts:', posts.length, 'First post status:', posts[0]?.status) || true}
                    {posts.map((post: any) => (
                      <div key={post._id} className="p-4 hover:bg-gray-50">
                        <div className="flex gap-4">
                          {/* Thumbnail */}
                          <div 
                            className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => handlePreview(post)}
                          >
                            {post.mediaUrl ? (
                              <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-medium text-gray-900 truncate">{post.title || 'Sem título'}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <StatusBadge status={post.status} />
                                  <span className="text-xs text-gray-500">
                                    {new Date(post.createdAt).toLocaleDateString('pt-BR')}
                                  </span>
                                  {post.aiModel === 'template-gratuito' && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                      Gratuito
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Ações */}
                              <div className="flex items-center gap-1">
                                {/* Editar - todos menos falhos/cancelados */}
                                {(post.status !== 'failed' && post.status !== 'cancelled') && (
                                  <button
                                    onClick={() => handleEdit(post)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                    title="Editar"
                                  >
                                    <EditIcon />
                                  </button>
                                )}

                                {/* Publicar via Make */}
                                {(post.status === 'scheduled' || post.status === 'draft') && (
                                  <button
                                    onClick={() => handlePublish(post._id)}
                                    disabled={publishingId === post._id}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                    title={makeStatus?.configured ? 'Enviar ao Make para publicar no Google' : 'Make não configurado'}
                                  >
                                    {publishingId === post._id ? (
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <PlayIcon />
                                    )}
                                    {makeStatus?.configured ? 'Publicar via Make' : 'Publicar'}
                                  </button>
                                )}

                                {/* Republicar - para posts já publicados ou falhos */}
                                {console.log('[DEBUG GMB] Post:', post._id, 'Status:', post.status, 'Title:', post.title?.substring(0, 30)) || true}
                                {(post.status === 'published' || post.status === 'failed') && (
                                  <button
                                    onClick={() => handleRepublish(post._id, post.title)}
                                    disabled={republishingId === post._id}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50"
                                    title="Republicar no Google Meu Negócio"
                                  >
                                    {republishingId === post._id ? (
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <RepublishIcon />
                                    )}
                                    Republicar
                                  </button>
                                )}

                                {/* 🤖 Publicar no Google - modo assistido (status 'ready') */}
                                {post.status === 'ready' && (
                                  <button
                                    onClick={() => handleOpenAssistedModal(post)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                                    title="Abrir assistente de publicação"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Publicar no Google
                                  </button>
                                )}
                                
                                {/* Preview - todos os posts */}
                                <button
                                  onClick={() => handlePreview(post)}
                                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                                  title="Ver post"
                                >
                                  Ver
                                </button>

                                {/* Deletar */}
                                <button
                                  onClick={() => handleDelete(post._id, post.title)}
                                  disabled={deletingId === post._id}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Deletar"
                                >
                                  {deletingId === post._id ? (
                                    <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                                  ) : (
                                    <TrashIcon />
                                  )}
                                </button>
                              </div>
                            </div>

                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{post.content}</p>

                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              {post.scheduledAt && (
                                <span className="flex items-center gap-1">
                                  <ClockIcon />
                                  {new Date(post.scheduledAt).toLocaleString('pt-BR')}
                                </span>
                              )}
                              {post.ctaUrl && (
                                <span className="truncate max-w-xs">
                                  → {post.ctaUrl.replace('https://www.clinicafonoinova.com.br/', '/')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'inteligencia' && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🧠</span>
                <h3 className="text-lg font-bold text-gray-900">Motor Inteligente GMB</h3>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                  Analisa agenda, vendas e reviews
                </span>
              </div>
              <GmbIntelligencePanel 
                onSuggestionAccepted={(post) => {
                  setAssistedModal({ open: true, post });
                  refresh();
                }}
              />
            </div>
          )}

          {activeTab === 'conversao' && (
            <GmbConversionDashboard />
          )}
        </div>
      </div>

      {/* Modal de Preview */}
      {previewModal?.open && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setPreviewModal(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Preview do Post</h3>
                {previewModal.metadata?.abVariant && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    previewModal.metadata.abVariant === 'A'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    Variante {previewModal.metadata.abVariant} — {previewModal.metadata.abLabel}
                  </span>
                )}
              </div>
              <button onClick={() => setPreviewModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {previewModal.imageUrl && (
                  <img src={previewModal.imageUrl} alt="" className="w-full aspect-square object-cover" />
                )}
                <div className="p-4">
                  <p className="text-gray-800 whitespace-pre-wrap">{previewModal.content}</p>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        if (previewModal.postId) {
                          openGmbWhatsApp(
                            { _id: previewModal.postId, metadata: previewModal.metadata },
                            '5562992013573',
                            previewModal.metadata?.abVariant === 'B'
                              ? 'Oi! Vi o post e quero agendar uma avaliação para meu filho.'
                              : 'Oi! Vi o conteúdo no Google e gostaria de mais informações.'
                          );
                        }
                      }}
                      className="flex items-center gap-2 text-blue-600 font-medium hover:text-blue-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      Saiba mais
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(previewModal.content || '');
                    toast.success('Texto copiado!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar texto
                </button>
                {previewModal.imageUrl && (
                  <button
                    onClick={async () => {
                      try {
                        const resp = await fetch(previewModal.imageUrl!);
                        const blob = await resp.blob();
                        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                        toast.success('Imagem copiada!');
                      } catch {
                        toast.error('Erro ao copiar imagem');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Copiar imagem
                  </button>
                )}
              </div>
              <button
                onClick={() => setPreviewModal(null)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editModal?.open && editModal.post && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setEditModal(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Editar Post</h3>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Imagem atual + botão regenerar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Imagem</label>
                  <button
                    onClick={handleRegenerateImage}
                    disabled={regeneratingImageId === editModal.post._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    title="Gerar nova imagem com IA (DALL-E 3 HD)"
                  >
                    {regeneratingImageId === editModal.post._id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Gerar nova imagem
                      </>
                    )}
                  </button>
                </div>
                {editModal.post.mediaUrl ? (
                  <div className="relative rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: '1/1' }}>
                    <img
                      src={editModal.post.mediaUrl}
                      alt="Imagem do post"
                      className="w-full h-full object-cover"
                    />
                    {regeneratingImageId === editModal.post._id && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="text-white text-sm font-medium">Gerando nova imagem...</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center h-32 text-gray-400 text-sm">
                    Sem imagem — clique em "Gerar nova imagem"
                  </div>
                )}
              </div>

              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={editModal.post.title || ''}
                  onChange={(e) => setEditModal({ ...editModal, post: { ...editModal.post, title: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Conteúdo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conteúdo <span className="text-gray-400">({editModal.post.content?.length || 0} caracteres)</span>
                </label>
                <textarea
                  value={editModal.post.content || ''}
                  onChange={(e) => setEditModal({ ...editModal, post: { ...editModal.post, content: e.target.value } })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">Limite do GMB: 1500 caracteres</p>
              </div>

              {/* Data/Hora */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agendado para</label>
                <input
                  type="datetime-local"
                  value={editModal.post.scheduledAt ? new Date(editModal.post.scheduledAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditModal({ ...editModal, post: { ...editModal.post, scheduledAt: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Preview ao vivo */}
              <div className="border-t pt-4">
                <label className="form-label">Preview</label>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{editModal.post.content}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🤖 Modal de Publicação Assistida */}
      <GmbAssistedPublishModal
        post={assistedModal?.post}
        isOpen={assistedModal?.open || false}
        onClose={() => setAssistedModal(null)}
        onPublished={() => {
          refresh();
          toast.success('Post marcado como publicado no Google!');
        }}
      />
    </div>
  );
};

export default GmbDashboard;
