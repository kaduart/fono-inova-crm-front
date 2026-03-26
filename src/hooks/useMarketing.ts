/**
 * 🎯 Hook centralizado para Marketing Dashboard
 * Gerencia GMB, Instagram, Facebook e Vídeos
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import API from '../services/api';
import { socketManager } from '../utils/socketManager';

// Types
export type Channel = 'gmb' | 'instagram' | 'facebook';
export type VideoStatus = 'processing' | 'ready' | 'failed';
export type FunnelStage = 'top' | 'middle' | 'bottom';

export interface Post {
  _id: string;
  title: string;
  headline?: string;
  subheadline?: string;
  caption?: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  status: 'draft' | 'approved' | 'scheduled' | 'published' | 'failed' | 'processing';
  scheduledAt?: string;
  publishedAt?: string;
  theme?: string;
  funnelStage?: FunnelStage;
  channels?: Channel[];
  gmbPostId?: string;
  instagramPostId?: string;
  facebookPostId?: string;
  createdAt: string;
  ctaUrl?: string;
  aiGenerated?: boolean;
  errorMessage?: string;
}

export type PublishTarget = 'organic' | 'paid' | 'both';

export interface CampaignConfig {
  name?: string;
  targeting?: {
    age_min?: number;
    age_max?: number;
    city?: string;
  };
}

export interface CTAConfig {
  texto: string;
  subtexto: string;
  cor: string;
}

export interface EditOptions {
  legendas: boolean;
  subtitleFontSize: number;
  subtitleFontColor: string;
  musica: 'calma' | 'esperancosa' | 'emocional' | null;
  musicVolume: number;
  cta: CTAConfig | null;
  logo: { usarPadrao?: boolean; url?: string } | null;
  logoPosition: string;
  watermarkText: string | null;
  trimStart: number;
  trimEnd: number;
}

export interface Video {
  _id: string;
  title: string;
  roteiro: string;
  especialidadeId: string;
  avatarId?: string;
  duration: number;
  status: VideoStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  videoEditadoUrl?: string;
  posProducaoStatus?: 'idle' | 'processing' | 'ready' | 'failed';
  posProducaoConfig?: { legendas?: boolean; musica?: string | null; cta?: CTAConfig | null };
  createdAt: string;
  publishedChannels?: Channel[];
  provider?: string;
}

export interface Stats {
  total: number;
  byStatus: {
    draft: number;
    scheduled: number;
    published: number;
    failed: number;
  };
  byFunnel: {
    top: number;
    middle: number;
    bottom: number;
  };
  publishedThisMonth: number;
}

interface ChannelData {
  posts: Post[];
  stats: Stats | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface VideoData {
  videos: Video[];
  loading: boolean;
  error: string | null;
}

export interface AdSpy {
  _id: string;
  adId: string;
  pageName: string;
  adText: string;
  adTitle: string;
  thumbnailUrl?: string;
  snapshotUrl: string;
  especialidade: string;
  funil: 'top' | 'middle' | 'bottom';
  daysActive: number;
  keyword: string;
  analysis?: {
    gancho: string;
    estrutura: string;
    cta: string;
    porqueConverte: string;
    pontosFracos: string;
  };
  adaptedPost?: string;
  saved?: boolean;
  createdAt: string;
}

interface SpyData {
  ads: AdSpy[];
  saved: AdSpy[];
  loading: boolean;
  error: string | null;
}

export type ImageProvider = 'auto' | 'google' | 'veo' | 'freepik' | 'fal' | 'together' | 'replicate' | 'pollinations' | 'gemini-nano';

export interface UseMarketingReturn {
  gmb: ChannelData & {
    publish: (postId: string) => Promise<void>;
    generate: (especialidadeId?: string, customTheme?: string, scheduledAt?: string, funnelStage?: FunnelStage, provider?: ImageProvider, generateImage?: boolean) => Promise<void>;
    delete: (postId: string) => Promise<void>;
    update: (postId: string, data: Partial<Post>) => Promise<void>;
    generateImage: (postId: string, content: string) => Promise<string | null>;
    loadMore: () => Promise<void>;
  };
  instagram: ChannelData & {
    approve: (postId: string) => Promise<void>;
    publish: (postId: string, target?: PublishTarget, campaign?: CampaignConfig) => Promise<void>;
    uploadMedia: (postId: string, file: File) => Promise<string>;
    generate: (especialidadeId?: string, customTheme?: string, funnelStage?: FunnelStage, provider?: ImageProvider, mode?: 'full' | 'caption' | 'hooks') => Promise<void>;
    delete: (postId: string) => Promise<void>;
    update: (postId: string, data: Partial<Post>) => Promise<void>;
    loadMore: () => Promise<void>;
  };
  facebook: ChannelData & {
    approve: (postId: string) => Promise<void>;
    publish: (postId: string, target?: PublishTarget, campaign?: CampaignConfig) => Promise<void>;
    uploadMedia: (postId: string, file: File) => Promise<string>;
    generate: (especialidadeId?: string, customTheme?: string, funnelStage?: FunnelStage, provider?: ImageProvider, mode?: 'full' | 'caption' | 'hooks') => Promise<void>;
    delete: (postId: string) => Promise<void>;
    update: (postId: string, data: Partial<Post>) => Promise<void>;
    loadMore: () => Promise<void>;
  };
  videos: VideoData & {
    generate: (data: { especialidadeId: string; roteiro: string; duration: number; modo?: 'avatar' | 'ilustrativo' | 'veo' | 'runway' | 'economico' | 'teste'; tone?: 'emotional' | 'educativo' | 'inspiracional' | 'bastidores'; platform?: 'instagram' | 'meta_ads'; subTema?: string; hookStyle?: string; objetivo?: string; intensidade?: string; preset?: string; roteiroEditado?: any; modoZeus?: boolean; zeusConfig?: any }) => Promise<void>;
    previewRoteiro: (data: { especialidadeId: string; tema?: string; duration?: number; modo?: string; tone?: string; platform?: string; subTema?: string; hookStyle?: string; objetivo?: string; intensidade?: string; modoZeus?: boolean; zeusConfig?: any }) => Promise<any>;
    publish: (videoId: string, channels: Channel[]) => Promise<void>;
    publishMeta: (videoId: string, data: { nomeCampanha?: string; copy?: any; targeting?: any }) => Promise<any>;
    delete: (videoId: string) => Promise<void>;
    editar: (videoId: string, options: EditOptions) => Promise<void>;
  };
  spy: SpyData & {
    search: (keyword: string, especialidade?: string) => Promise<void>;
    save: (ad: AdSpy) => Promise<void>;
    delete: (adId: string) => Promise<void>;
    analyze: (adText: string, pageName: string) => Promise<any>;
    adapt: (adText: string, especialidade: string, funil: string, analysis?: any) => Promise<string>;
    listSaved: () => Promise<void>;
  };
  refresh: () => void;
  loading: boolean;
}

export function useMarketing(): UseMarketingReturn {
  const [gmbData, setGmbData] = useState<ChannelData>({
    posts: [],
    stats: null,
    loading: true,
    error: null,
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1, hasMore: false }
  });
  
  const [instagramData, setInstagramData] = useState<ChannelData>({
    posts: [],
    stats: null,
    loading: true,
    error: null,
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1, hasMore: false }
  });
  
  const [facebookData, setFacebookData] = useState<ChannelData>({
    posts: [],
    stats: null,
    loading: true,
    error: null,
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1, hasMore: false }
  });
  
  const [videosData, setVideosData] = useState<VideoData>({
    videos: [],
    loading: true,
    error: null
  });

  const [spyData, setSpyData] = useState<SpyData>({
    ads: [],
    saved: [],
    loading: false,
    error: null
  });

  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch GMB data com paginação
  const fetchGmbData = useCallback(async (page = 1, limit = 20, append = false) => {
    try {
      setGmbData(prev => ({ ...prev, loading: true, error: null }));
      const [postsRes, statsRes] = await Promise.all([
        API.get(`/gmb/posts?page=${page}&limit=${limit}`),
        API.get('/gmb/posts/stats')
      ]);
      
      const newPosts = postsRes.data.data || [];
      const pagination = postsRes.data.pagination || { page, limit, total: newPosts.length, totalPages: 1, hasMore: false };
      
      setGmbData(prev => ({
        posts: append ? [...prev.posts, ...newPosts] : newPosts,
        stats: statsRes.data.data || null,
        loading: false,
        error: null,
        pagination
      }));
      
      return pagination;
    } catch (err: any) {
      setGmbData(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.error || 'Erro ao carregar GMB'
      }));
      return null;
    }
  }, []);

  // Fetch Instagram data com paginação
  const fetchInstagramData = useCallback(async (page = 1, limit = 20, append = false) => {
    try {
      setInstagramData(prev => ({ ...prev, loading: true, error: null }));
      const [postsRes, statsRes] = await Promise.all([
        API.get(`/instagram/posts?page=${page}&limit=${limit}`),
        API.get('/instagram/posts/stats')
      ]);
      
      const newPosts = postsRes.data.data || [];
      const pagination = postsRes.data.pagination || { page, limit, total: newPosts.length, totalPages: 1, hasMore: false };
      
      setInstagramData(prev => ({
        posts: append ? [...prev.posts, ...newPosts] : newPosts,
        stats: statsRes.data.data || null,
        loading: false,
        error: null,
        pagination
      }));
    } catch (err: any) {
      setInstagramData(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.error || 'Erro ao carregar Instagram'
      }));
    }
  }, []);

  // Fetch Facebook data com paginação
  const fetchFacebookData = useCallback(async (page = 1, limit = 20, append = false) => {
    try {
      setFacebookData(prev => ({ ...prev, loading: true, error: null }));
      const [postsRes, statsRes] = await Promise.all([
        API.get(`/facebook/posts?page=${page}&limit=${limit}`),
        API.get('/facebook/posts/stats')
      ]);
      
      const newPosts = postsRes.data.data || [];
      const pagination = postsRes.data.pagination || { page, limit, total: newPosts.length, totalPages: 1, hasMore: false };
      
      setFacebookData(prev => ({
        posts: append ? [...prev.posts, ...newPosts] : newPosts,
        stats: statsRes.data.data || null,
        loading: false,
        error: null,
        pagination
      }));
    } catch (err: any) {
      setFacebookData(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.error || 'Erro ao carregar Facebook'
      }));
    }
  }, []);

  // Fetch Videos data
  const fetchVideosData = useCallback(async (isPolling = false) => {
    try {
      // Não atualizar loading durante polling automático (evita flickering)
      if (!isPolling) {
        setVideosData(prev => ({ ...prev, loading: true, error: null }));
      }
      const res = await API.get('/videos');
      
      setVideosData(prev => ({
        videos: res.data.data || [],
        loading: false,
        error: null
      }));
    } catch (err: any) {
      setVideosData(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.error || 'Erro ao carregar vídeos'
      }));
    }
  }, []);

  // Load all data on mount and refresh
  useEffect(() => {
    fetchGmbData();
    fetchInstagramData();
    fetchFacebookData();
    fetchVideosData();
  }, [refreshKey, fetchGmbData, fetchInstagramData, fetchFacebookData, fetchVideosData]);

  // Refs estáveis — evitam recriar o interval a cada atualização de state
  const processingRef = useRef({ videos: false, instagram: false, facebook: false });

  useEffect(() => {
    processingRef.current.videos = videosData.videos.some(
      v => v.status === 'processing' || v.posProducaoStatus === 'processing'
    );
  }, [videosData.videos]);

  useEffect(() => {
    processingRef.current.instagram = instagramData.posts.some(p => p.status === 'processing');
  }, [instagramData.posts]);

  useEffect(() => {
    processingRef.current.facebook = facebookData.posts.some(p => p.status === 'processing');
  }, [facebookData.posts]);

  // Polling apenas para Instagram/Facebook (sem vídeos — vídeos usam socket)
  useEffect(() => {
    const interval = setInterval(() => {
      if (processingRef.current.instagram) fetchInstagramData(1, 20, false);
      if (processingRef.current.facebook) fetchFacebookData(1, 20, false);
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchInstagramData, fetchFacebookData]);

  // Socket: atualiza lista de vídeos só quando um vídeo conclui ou falha
  useEffect(() => {
    const unsub = socketManager.on('video:status', () => {
      fetchVideosData(true);
    });
    return unsub;
  }, [fetchVideosData]);

  // GMB Actions
  const gmbPublish = async (postId: string) => {
    await API.post(`/gmb/posts/${postId}/publish`);
    await fetchGmbData();
  };

  const gmbGenerate = async (especialidadeId?: string, customTheme?: string, scheduledAt?: string, funnelStage?: FunnelStage, provider?: ImageProvider, generateImage: boolean = true) => {
    // 🚀 ASYNC: Não espera resposta completa, retorna imediatamente
    await API.post('/gmb/admin/trigger-generation', {
      especialidadeId,
      customTheme,
      generateImage,
      scheduledAt,
      funnelStage,
      provider
    });
    // Não faz await fetchGmbData() aqui — deixa o toast aparecer e libera UI
  };

  const gmbDelete = async (postId: string) => {
    await API.delete(`/gmb/posts/${postId}`);
    await fetchGmbData();
  };

  const gmbUpdate = async (postId: string, data: Partial<Post>) => {
    await API.put(`/gmb/posts/${postId}`, data);
    await fetchGmbData();
  };

  const gmbGenerateImage = async (postId: string, content: string): Promise<string | null> => {
    const res = await API.post('/gmb/preview/image', { content });
    return res.data.data?.imageUrl || null;
  };

  // Instagram Actions
  const instagramApprove = async (postId: string) => {
    await API.post(`/instagram/posts/${postId}/approve`);
    await fetchInstagramData();
  };

  const instagramPublish = async (postId: string, target: PublishTarget = 'organic', campaign?: CampaignConfig) => {
    await API.post(`/instagram/posts/${postId}/publish`, { target, campaign });
    await fetchInstagramData();
  };

  const instagramUploadMedia = async (postId: string, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await API.post(`/instagram/posts/${postId}/upload-media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    await fetchInstagramData();
    return res.data.data.mediaUrl;
  };

  const instagramGenerate = async (especialidadeId?: string, customTheme?: string, funnelStage?: FunnelStage, provider?: ImageProvider, mode: 'full' | 'caption' | 'hooks' = 'full') => {
    await API.post('/instagram/generate', { especialidadeId, customTheme, funnelStage, provider, mode });
  };

  const instagramDelete = async (postId: string) => {
    await API.delete(`/instagram/posts/${postId}`);
    await fetchInstagramData();
  };

  const instagramUpdate = async (postId: string, data: Partial<Post>) => {
    await API.put(`/instagram/posts/${postId}`, data);
    await fetchInstagramData();
  };

  // Facebook Actions
  const facebookApprove = async (postId: string) => {
    await API.post(`/facebook/posts/${postId}/approve`);
    await fetchFacebookData();
  };

  const facebookPublish = async (postId: string, target: PublishTarget = 'organic', campaign?: CampaignConfig) => {
    await API.post(`/facebook/posts/${postId}/publish`, { target, campaign });
    await fetchFacebookData();
  };

  const facebookUploadMedia = async (postId: string, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await API.post(`/facebook/posts/${postId}/upload-media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    await fetchFacebookData();
    return res.data.data.mediaUrl;
  };

  const facebookGenerate = async (especialidadeId?: string, customTheme?: string, funnelStage?: FunnelStage, provider?: ImageProvider, mode: 'full' | 'caption' | 'hooks' = 'full') => {
    await API.post('/facebook/generate', { especialidadeId, customTheme, funnelStage, provider, mode });
  };

  const facebookDelete = async (postId: string) => {
    await API.delete(`/facebook/posts/${postId}`);
    await fetchFacebookData();
  };

  const facebookUpdate = async (postId: string, data: Partial<Post>) => {
    await API.put(`/facebook/posts/${postId}`, data);
    await fetchFacebookData();
  };

  // Video Actions
  const videoGenerate = async (data: { especialidadeId: string; roteiro: string; duration: number; modo?: string; tone?: string; platform?: string; subTema?: string; hookStyle?: string; objetivo?: string; intensidade?: string; roteiroEditado?: any; modoZeus?: boolean; zeusConfig?: any }) => {
    await API.post('/videos', data);
    await fetchVideosData();
  };

  const videoPreviewRoteiro = async (data: { especialidadeId: string; tema?: string; duration?: number; modo?: string; tone?: string; platform?: string; subTema?: string; hookStyle?: string; objetivo?: string; intensidade?: string; modoZeus?: boolean; zeusConfig?: any }) => {
    const body: any = {
      tema: data.tema || '',
      especialidadeId: data.especialidadeId,
      funil: 'TOPO',
      duracao: data.duration || 30,
      tone: data.tone || 'educativo',
      platform: data.platform || 'instagram',
      subTema: data.subTema,
      hookStyle: data.hookStyle || 'dor',
      objetivo: data.objetivo || 'salvar',
      intensidade: data.intensidade || 'viral'
    };
    
    if (data.modoZeus) {
      body.modoZeus = true;
      body.zeusConfig = data.zeusConfig;
    }
    
    const res = await API.post('/videos/preview-roteiro', body);
    return res.data.roteiro;
  };

  const videoPublish = async (videoId: string, channels: Channel[]) => {
    await API.post(`/videos/${videoId}/publish`, { channels });
    await fetchVideosData();
  };

  const videoPublishMeta = async (videoId: string, data: { nomeCampanha?: string; copy?: any; targeting?: any }) => {
    const res = await API.post(`/videos/${videoId}/publish-meta`, data);
    await fetchVideosData();
    return res.data;
  };

  const videoDelete = async (videoId: string) => {
    await API.delete(`/videos/${videoId}`);
    await fetchVideosData();
  };

  const videoEditar = async (videoId: string, options: EditOptions) => {
    await API.post(`/videos/${videoId}/pos-producao`, options);
    // Refresh após 2s para mostrar estado "processing"
    setTimeout(fetchVideosData, 2000);
  };

  // Spy Actions
  const spySearch = async (keyword: string, especialidade?: string) => {
    setSpyData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await API.get('/spy/ads', { params: { keyword, especialidade } });
      setSpyData(prev => ({ ...prev, ads: res.data.data || [], loading: false }));
    } catch (err: any) {
      setSpyData(prev => ({ ...prev, loading: false, error: err.response?.data?.error }));
    }
  };

  const spySave = async (ad: AdSpy) => {
    await API.post('/spy/saved', ad);
    await spyListSaved();
  };

  const spyDelete = async (adId: string) => {
    await API.delete(`/spy/saved/${adId}`);
    await spyListSaved();
  };

  const spyAnalyze = async (adText: string, pageName: string) => {
    const res = await API.post('/spy/analyze', { adText, pageName });
    return res.data.data;
  };

  const spyAdapt = async (adText: string, especialidade: string, funil: string, analysis?: any) => {
    const res = await API.post('/spy/adapt', { adText, especialidade, funil, analysis });
    return res.data.data.adaptedPost;
  };

  const spyListSaved = async () => {
    try {
      const res = await API.get('/spy/saved');
      setSpyData(prev => ({ ...prev, saved: res.data.data || [] }));
    } catch (err) {
      console.error('Erro ao listar salvos:', err);
    }
  };

  // Refresh all
  const refresh = () => setRefreshKey(k => k + 1);

  // Funções loadMore
  const gmbLoadMore = useCallback(async () => {
    if (gmbData.pagination.hasMore && !gmbData.loading) {
      await fetchGmbData(gmbData.pagination.page + 1, gmbData.pagination.limit, true);
    }
  }, [fetchGmbData, gmbData.pagination.hasMore, gmbData.pagination.page, gmbData.loading]);

  const instagramLoadMore = useCallback(async () => {
    if (instagramData.pagination.hasMore && !instagramData.loading) {
      await fetchInstagramData(instagramData.pagination.page + 1, instagramData.pagination.limit, true);
    }
  }, [fetchInstagramData, instagramData.pagination.hasMore, instagramData.pagination.page, instagramData.loading]);

  const facebookLoadMore = useCallback(async () => {
    if (facebookData.pagination.hasMore && !facebookData.loading) {
      await fetchFacebookData(facebookData.pagination.page + 1, facebookData.pagination.limit, true);
    }
  }, [fetchFacebookData, facebookData.pagination.hasMore, facebookData.pagination.page, facebookData.loading]);

  return {
    gmb: {
      ...gmbData,
      publish: gmbPublish,
      generate: gmbGenerate,
      delete: gmbDelete,
      update: gmbUpdate,
      generateImage: gmbGenerateImage,
      loadMore: gmbLoadMore
    },
    instagram: {
      ...instagramData,
      approve: instagramApprove,
      publish: instagramPublish,
      uploadMedia: instagramUploadMedia,
      generate: instagramGenerate,
      delete: instagramDelete,
      update: instagramUpdate,
      loadMore: instagramLoadMore
    },
    facebook: {
      ...facebookData,
      approve: facebookApprove,
      publish: facebookPublish,
      uploadMedia: facebookUploadMedia,
      generate: facebookGenerate,
      delete: facebookDelete,
      update: facebookUpdate,
      loadMore: facebookLoadMore
    },
    videos: {
      ...videosData,
      generate: videoGenerate,
      previewRoteiro: videoPreviewRoteiro,
      publish: videoPublish,
      publishMeta: videoPublishMeta,
      delete: videoDelete,
      editar: videoEditar
    },
    spy: {
      ...spyData,
      search: spySearch,
      save: spySave,
      delete: spyDelete,
      analyze: spyAnalyze,
      adapt: spyAdapt,
      listSaved: spyListSaved
    },
    refresh,
    loading: gmbData.loading || instagramData.loading || facebookData.loading || videosData.loading || spyData.loading
  };
}
