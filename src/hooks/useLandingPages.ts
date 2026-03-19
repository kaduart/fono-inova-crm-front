/**
 * 🎯 useLandingPages Hook
 * Gerencia landing pages de alta conversão
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../services/api';

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface LandingPage {
  _id: string;
  slug: string;
  title: string;
  headline: string;
  subheadline?: string;
  category: 'fonoaudiologia' | 'autismo' | 'psicologia' | 'aprendizagem' | 'terapia_ocupacional' | 'geografica';
  keywords: string[];
  sinaisAlerta: Array<{ icon: string; text: string }>;
  content: {
    quandoProcurar?: string;
    comoFunciona?: string;
    benefícios?: string[];
  };
  cta: {
    text: string;
    link: string;
    phone: string;
  };
  seo: {
    title: string;
    description: string;
    ogImage?: string;
  };
  status: 'active' | 'inactive' | 'draft';
  metrics: {
    views: number;
    leads: number;
    conversionRate: number;
  };
  location?: {
    city: string;
    state: string;
  };
  isDefault: boolean;
  priority: number;
  lastUsedInPost?: string;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyLandingPages {
  fonoaudiologia?: LandingPage;
  autismo?: LandingPage;
  psicologia?: LandingPage;
  aprendizagem?: LandingPage;
  terapia_ocupacional?: LandingPage;
}

export interface PostSuggestion {
  title: string;
  content: string;
  landingPageSlug: string;
  landingPageUrl: string;
  category: string;
  suggestedCta: string;
}

export interface LandingPageStats {
  total: number;
  byCategory: Record<string, number>;
  mostUsed: Array<{
    slug: string;
    title: string;
    postCount: number;
    metrics: { views: number; leads: number };
  }>;
  totalViews: number;
  totalLeads: number;
  averageConversion: string;
}

export interface UseLandingPagesReturn {
  // Dados
  landingPages: LandingPage[];
  dailyPages: DailyLandingPages | null;
  stats: LandingPageStats | null;
  
  // Estados
  loading: boolean;
  error: string | null;
  
  // Ações
  fetchLandingPages: (params?: { category?: string; search?: string }) => Promise<void>;
  fetchDailyPages: () => Promise<void>;
  fetchStats: () => Promise<void>;
  suggestForPost: (category?: string) => Promise<LandingPage[]>;
  getPostSuggestion: (slug: string) => Promise<PostSuggestion>;
  createFullPost: (slug: string, options?: { scheduledAt?: string }) => Promise<{
    postId: string;
    title: string;
    hasImage: boolean;
    imageProvider?: string;
    status: string;
  }>;
  markAsUsed: (slug: string) => Promise<void>;
  seedLandingPages: () => Promise<{ created: number; skipped: number; total: number }>;
  
  // Helpers
  getCategoryLabel: (category: string) => string;
  getCategoryColor: (category: string) => string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_LABELS: Record<string, string> = {
  fonoaudiologia: '🗣️ Fonoaudiologia',
  autismo: '🧩 Autismo',
  psicologia: '🧠 Psicologia',
  aprendizagem: '📚 Aprendizagem',
  terapia_ocupacional: '🤲 Terapia Ocupacional',
  geografica: '📍 Geográfica'
};

const CATEGORY_COLORS: Record<string, string> = {
  fonoaudiologia: 'purple',
  autismo: 'blue',
  psicologia: 'pink',
  aprendizagem: 'amber',
  terapia_ocupacional: 'emerald',
  geografica: 'gray'
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎣 HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useLandingPages(): UseLandingPagesReturn {
  // Estados
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [dailyPages, setDailyPages] = useState<DailyLandingPages | null>(null);
  const [stats, setStats] = useState<LandingPageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // 📥 FETCHES
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchLandingPages = useCallback(async (params: { category?: string; search?: string } = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      if (params.category && params.category !== 'all') {
        queryParams.append('category', params.category);
      }
      if (params.search) {
        queryParams.append('search', params.search);
      }
      
      const response = await API.get(`/landing-pages?${queryParams}`);
      setLandingPages(response.data?.data || []);
    } catch (err: any) {
      console.error('Erro ao buscar landing pages:', err);
      setError(err.response?.data?.error || 'Erro ao buscar landing pages');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDailyPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await API.get('/landing-pages/daily');
      setDailyPages(response.data?.data || null);
    } catch (err: any) {
      console.error('Erro ao buscar LPs do dia:', err);
      setError(err.response?.data?.error || 'Erro ao buscar LPs do dia');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await API.get('/landing-pages/stats');
      setStats(response.data?.data || null);
    } catch (err: any) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  }, []);

  const suggestForPost = useCallback(async (category?: string): Promise<LandingPage[]> => {
    try {
      const queryParams = new URLSearchParams();
      if (category) queryParams.append('category', category);
      queryParams.append('limit', '5');
      
      const response = await API.get(`/landing-pages/suggest?${queryParams}`);
      return response.data?.data || [];
    } catch (err: any) {
      console.error('Erro ao sugerir LPs:', err);
      return [];
    }
  }, []);

  const getPostSuggestion = useCallback(async (slug: string): Promise<PostSuggestion> => {
    try {
      const response = await API.get(`/landing-pages/${slug}/post-suggestion`);
      return response.data?.data;
    } catch (err: any) {
      console.error('Erro ao gerar sugestão:', err);
      throw err;
    }
  }, []);

  /**
   * 🎯 Cria post COMPLETO no GMB a partir de uma landing page
   * Busca imagem no ImageBank ou gera nova
   */
  const createFullPost = useCallback(async (slug: string, options?: { scheduledAt?: string }): Promise<{
    postId: string;
    title: string;
    hasImage: boolean;
    imageProvider?: string;
    status: string;
  }> => {
    try {
      const response = await API.post(`/landing-pages/${slug}/create-post`, {
        scheduledAt: options?.scheduledAt
      });
      
      // Atualiza lista local
      setLandingPages(prev => prev.map(lp => 
        lp.slug === slug 
          ? { ...lp, postCount: lp.postCount + 1, lastUsedInPost: new Date().toISOString() }
          : lp
      ));
      
      return response.data?.data;
    } catch (err: any) {
      console.error('Erro ao criar post:', err);
      throw err;
    }
  }, []);

  const markAsUsed = useCallback(async (slug: string) => {
    try {
      await API.post(`/landing-pages/${slug}/use`);
      // Atualiza lista local
      setLandingPages(prev => prev.map(lp => 
        lp.slug === slug 
          ? { ...lp, postCount: lp.postCount + 1, lastUsedInPost: new Date().toISOString() }
          : lp
      ));
    } catch (err: any) {
      console.error('Erro ao marcar LP:', err);
      throw err;
    }
  }, []);

  const seedLandingPages = useCallback(async () => {
    try {
      const response = await API.post('/landing-pages/seed');
      // Recarrega lista após seed
      await fetchLandingPages();
      return response.data?.data;
    } catch (err: any) {
      console.error('Erro no seed:', err);
      throw err;
    }
  }, [fetchLandingPages]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const getCategoryLabel = useCallback((category: string): string => {
    return CATEGORY_LABELS[category] || category;
  }, []);

  const getCategoryColor = useCallback((category: string): string => {
    return CATEGORY_COLORS[category] || 'gray';
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔄 RETORNO
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Dados
    landingPages,
    dailyPages,
    stats,
    
    // Estados
    loading,
    error,
    
    // Ações
    fetchLandingPages,
    fetchDailyPages,
    fetchStats,
    suggestForPost,
    getPostSuggestion,
    createFullPost,
    markAsUsed,
    seedLandingPages,
    
    // Helpers
    getCategoryLabel,
    getCategoryColor
  };
}

export default useLandingPages;
