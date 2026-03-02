/**
 * 🎯 Hook centralizado para Marketing Dashboard
 * Gerencia GMB, Instagram, Facebook e Vídeos
 */

import { useState, useEffect, useCallback } from 'react';
import API from '../services/api';

// Types
export type Channel = 'gmb' | 'instagram' | 'facebook';
export type VideoStatus = 'processing' | 'ready' | 'failed';
export type FunnelStage = 'top' | 'middle' | 'bottom';

export interface Post {
  _id: string;
  title: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
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
  createdAt: string;
  publishedChannels?: Channel[];
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

export type ImageProvider = 'auto' | 'freepik' | 'fal' | 'together' | 'replicate' | 'pollinations' | 'gemini-nano';

export interface UseMarketingReturn {
  gmb: ChannelData & {
    publish: (postId: string) => Promise<void>;
    generate: (especialidadeId?: string, customTheme?: string, scheduledAt?: string, funnelStage?: FunnelStage, provider?: ImageProvider, generateImage?: boolean) => Promise<void>;
    delete: (postId: string) => Promise<void>;
    update: (postId: string, data: Partial<Post>) => Promise<void>;
    generateImage: (postId: string, content: string) => Promise<string | null>;
  };
  instagram: ChannelData & {
    publish: (postId: string) => Promise<void>;
    generate: (especialidadeId?: string, customTheme?: string, funnelStage?: FunnelStage, provider?: ImageProvider, mode?: 'full' | 'caption' | 'hooks') => Promise<void>;
    delete: (postId: string) => Promise<void>;
    update: (postId: string, data: Partial<Post>) => Promise<void>;
  };
  facebook: ChannelData & {
    publish: (postId: string) => Promise<void>;
    generate: (especialidadeId?: string, customTheme?: string, funnelStage?: FunnelStage, provider?: ImageProvider, mode?: 'full' | 'caption' | 'hooks') => Promise<void>;
    delete: (postId: string) => Promise<void>;
    update: (postId: string, data: Partial<Post>) => Promise<void>;
  };
  videos: VideoData & {
    generate: (data: { especialidadeId: string; roteiro: string; duration: number; modo?: 'avatar' | 'ilustrativo' }) => Promise<void>;
    publish: (videoId: string, channels: Channel[]) => Promise<void>;
    delete: (videoId: string) => Promise<void>;
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
    error: null
  });
  
  const [instagramData, setInstagramData] = useState<ChannelData>({
    posts: [],
    stats: null,
    loading: true,
    error: null
  });
  
  const [facebookData, setFacebookData] = useState<ChannelData>({
    posts: [],
    stats: null,
    loading: true,
    error: null
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

  // Fetch GMB data
  const fetchGmbData = useCallback(async () => {
    try {
      setGmbData(prev => ({ ...prev, loading: true, error: null }));
      const [postsRes, statsRes] = await Promise.all([
        API.get('/gmb/posts'),
        API.get('/gmb/posts/stats')
      ]);
      
      setGmbData({
        posts: postsRes.data.data || [],
        stats: statsRes.data.data || null,
        loading: false,
        error: null
      });
    } catch (err: any) {
      setGmbData(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.error || 'Erro ao carregar GMB'
      }));
    }
  }, []);

  // Fetch Instagram data
  const fetchInstagramData = useCallback(async () => {
    try {
      setInstagramData(prev => ({ ...prev, loading: true, error: null }));
      const [postsRes, statsRes] = await Promise.all([
        API.get('/instagram/posts'),
        API.get('/instagram/posts/stats')
      ]);
      
      setInstagramData({
        posts: postsRes.data.data || [],
        stats: statsRes.data.data || null,
        loading: false,
        error: null
      });
    } catch (err: any) {
      setInstagramData(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.error || 'Erro ao carregar Instagram'
      }));
    }
  }, []);

  // Fetch Facebook data
  const fetchFacebookData = useCallback(async () => {
    try {
      setFacebookData(prev => ({ ...prev, loading: true, error: null }));
      const [postsRes, statsRes] = await Promise.all([
        API.get('/facebook/posts'),
        API.get('/facebook/posts/stats')
      ]);
      
      setFacebookData({
        posts: postsRes.data.data || [],
        stats: statsRes.data.data || null,
        loading: false,
        error: null
      });
    } catch (err: any) {
      setFacebookData(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.error || 'Erro ao carregar Facebook'
      }));
    }
  }, []);

  // Fetch Videos data
  const fetchVideosData = useCallback(async () => {
    try {
      setVideosData(prev => ({ ...prev, loading: true, error: null }));
      const res = await API.get('/videos');
      
      setVideosData({
        videos: res.data.data || [],
        loading: false,
        error: null
      });
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
  const instagramPublish = async (postId: string) => {
    await API.post(`/instagram/posts/${postId}/publish`);
    await fetchInstagramData();
  };

  const instagramGenerate = async (especialidadeId?: string, customTheme?: string, funnelStage?: FunnelStage, provider?: ImageProvider, mode: 'full' | 'caption' | 'hooks' = 'full') => {
    // 🚀 ASYNC: Não espera resposta completa
    await API.post('/instagram/generate', {
      especialidadeId,
      customTheme,
      funnelStage,
      provider,
      mode
    });
    // Não faz await fetchInstagramData() aqui
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
  const facebookPublish = async (postId: string) => {
    await API.post(`/facebook/posts/${postId}/publish`);
    await fetchFacebookData();
  };

  const facebookGenerate = async (especialidadeId?: string, customTheme?: string, funnelStage?: FunnelStage, provider?: ImageProvider, mode: 'full' | 'caption' | 'hooks' = 'full') => {
    // 🚀 ASYNC: Não espera resposta completa
    await API.post('/facebook/generate', {
      especialidadeId,
      customTheme,
      funnelStage,
      provider,
      mode
    });
    // Não faz await fetchFacebookData() aqui
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
  const videoGenerate = async (data: { especialidadeId: string; roteiro: string; duration: number; modo?: 'avatar' | 'ilustrativo' }) => {
    await API.post('/videos', data);
    await fetchVideosData();
  };

  const videoPublish = async (videoId: string, channels: Channel[]) => {
    await API.post(`/videos/${videoId}/publish`, { channels });
    await fetchVideosData();
  };

  const videoDelete = async (videoId: string) => {
    await API.delete(`/videos/${videoId}`);
    await fetchVideosData();
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

  return {
    gmb: {
      ...gmbData,
      publish: gmbPublish,
      generate: gmbGenerate,
      delete: gmbDelete,
      update: gmbUpdate,
      generateImage: gmbGenerateImage
    },
    instagram: {
      ...instagramData,
      publish: instagramPublish,
      generate: instagramGenerate,
      delete: instagramDelete,
      update: instagramUpdate
    },
    facebook: {
      ...facebookData,
      publish: facebookPublish,
      generate: facebookGenerate,
      delete: facebookDelete,
      update: facebookUpdate
    },
    videos: {
      ...videosData,
      generate: videoGenerate,
      publish: videoPublish,
      delete: videoDelete
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
