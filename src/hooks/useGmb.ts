import { useState, useEffect } from 'react';
import API from '../services/api';

export interface GmbPost {
  _id: string;
  title?: string;
  content: string;
  status: 'draft' | 'ready' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  mediaUrl?: string;
  scheduledAt?: string;
  publishedAt?: string;
  ctaUrl?: string;
  aiModel?: string;
  createdAt: string;
  assistData?: {
    gmbUrl?: string;
    copyText?: string;
    copiedAt?: string;
  };
}

export interface GmbStats {
  total: number;
  byStatus: Record<string, number>;
  publishedThisMonth: number;
}

export function useGmb() {
  const [posts, setPosts] = useState<GmbPost[]>([]);
  const [stats, setStats] = useState<GmbStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [postsRes, statsRes] = await Promise.all([
        API.get('/gmb/posts'),
        API.get('/gmb/posts/stats'),
      ]);
      setPosts(postsRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao carregar dados do GMB');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  return { posts, stats, loading, error, refresh: fetchAll };
}

export default useGmb;
