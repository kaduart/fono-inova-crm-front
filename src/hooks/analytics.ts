import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { 
  analyticsService, 
  GAEvent, 
  GAMetrics, 
  DashboardData,
  TrafficSource,
  PageData,
  ConversionEvent
} from '../services/analytics.js';

interface UseAnalyticsProps {
    startDate?: string;
    endDate?: string;
}

// Hook original (mantém compatibilidade)
export const useAnalytics = ({ startDate, endDate }: UseAnalyticsProps = {}) => {
    const [events, setEvents] = useState<GAEvent[]>([]);
    const [metrics, setMetrics] = useState<GAMetrics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await analyticsService.fetchEvents({ startDate, endDate });
            setEvents(response.data);
        } catch (err: any) {
            console.error('Erro ao buscar eventos GA4:', err);
            setError(err.message);
            toast.error('Erro ao buscar eventos');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await analyticsService.fetchMetrics({ startDate, endDate });
            setMetrics(response.data);
        } catch (err: any) {
            console.error('Erro ao buscar métricas GA4:', err);
            setError(err.message);
            toast.error('Erro ao buscar métricas');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchEvents();
        fetchMetrics();
    }, [fetchEvents, fetchMetrics]);

    return {
        events,
        metrics,
        loading,
        error,
        fetchEvents,
        fetchMetrics,
    };
};

// 🆕 NOVO: Hook completo com dashboard
export const useAnalyticsDashboard = ({ startDate, endDate }: UseAnalyticsProps = {}) => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('🔄 Buscando dashboard para:', { startDate, endDate });
            const response = await analyticsService.fetchDashboard({ startDate, endDate });
            console.log('✅ Dashboard recebido:', response.data);
            setData(response.data);
        } catch (err: any) {
            console.error('Erro ao buscar dashboard:', err);
            setError(err.message);
            toast.error('Erro ao carregar dashboard');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    return {
        data,
        loading,
        error,
        refetch: fetchDashboard,
        // Helpers para acesso fácil
        metrics: data?.metrics || null,
        events: data?.events || [],
        sources: data?.sources || [],
        pages: data?.pages || [],
        conversions: data?.conversions || [],
        realtime: data?.realtime || { activeUsers: 0, pageViews: 0, events: 0 },
    };
};

export default useAnalytics;

// Hook para métricas de páginas específicas (Fono, Psico, etc.)
export const usePageAnalytics = (pagePath?: string) => {
    const [pageData, setPageData] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchPageData = useCallback(async () => {
        if (!pagePath) return;
        
        setLoading(true);
        try {
            const response = await analyticsService.fetchDashboard();
            const pages = response.data.pages || [];
            const found = pages.find(p => 
                p.path === pagePath || 
                p.path.includes(pagePath) ||
                p.title.toLowerCase().includes(pagePath.toLowerCase())
            );
            setPageData(found || null);
        } catch (err) {
            console.error('Erro ao buscar dados da página:', err);
        } finally {
            setLoading(false);
        }
    }, [pagePath]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    return { pageData, loading, refetch: fetchPageData };
};

// Lista de páginas de serviços para o dashboard
export const SERVICE_PAGES = [
    { id: 'home', title: 'Home', path: '/', icon: '🏠' },
    { id: 'fonoaudiologia', title: 'Fonoaudiologia', path: '/fonoaudiologia', icon: '🗣️' },
    { id: 'psicologia', title: 'Psicologia', path: '/psicologia', icon: '🧠' },
    { id: 'fisioterapia', title: 'Fisioterapia', path: '/fisioterapia', icon: '🏃' },
    { id: 'terapia-ocupacional', title: 'Terapia Ocupacional', path: '/terapia-ocupacional', icon: '🤲' },
    { id: 'freio-lingual', title: 'Teste da Linguinha', path: '/freio-lingual', icon: '👅' },
    { id: 'psicopedagogia', title: 'Psicopedagogia', path: '/psicopedagogia', icon: '📚' },
    { id: 'neuropsicologia', title: 'Neuropsicologia', path: '/avaliacao-neuropsicologica', icon: '🧩' },
    { id: 'tea', title: 'Autismo (TEA)', path: '/avaliacao-autismo-infantil', icon: '🧩' },
    { id: 'fala-tardia', title: 'Fala Tardia', path: '/fala-tardia', icon: '💬' },
    { id: 'dificuldade-escolar', title: 'Dificuldade Escolar', path: '/avaliacao-neuropsicologica-dificuldade-escolar', icon: '📝' },
    // 🎯 NOVAS Páginas SEO Local - Anápolis (Mar/2026)
    { id: 'fonoaudiologia-anapolis', title: 'Fonoaudiologia Anápolis', path: '/fonoaudiologia-anapolis', icon: '🗣️📍' },
    { id: 'psicologia-infantil-anapolis', title: 'Psicologia Infantil Anápolis', path: '/psicologia-infantil-anapolis', icon: '🧠👶' },
    { id: 'terapia-ocupacional-anapolis', title: 'Terapia Ocupacional Anápolis', path: '/terapia-ocupacional-anapolis', icon: '🤲📍' },
    { id: 'psicomotricidade-anapolis', title: 'Psicomotricidade Anápolis', path: '/psicomotricidade-anapolis', icon: '🏃‍♀️📍' },
    { id: 'teste-da-linguinha-anapolis', title: 'Teste da Linguinha Anápolis', path: '/teste-da-linguinha-anapolis', icon: '👅📍' },
    { id: 'fisioterapia-infantil-anapolis', title: 'Fisioterapia Infantil Anápolis', path: '/fisioterapia-infantil-anapolis', icon: '🏃👶' },
    { id: 'avaliacao-neuropsicologica-anapolis', title: 'Avaliação Neuropsicológica Anápolis', path: '/avaliacao-neuropsicologica-anapolis', icon: '🧩📍' },
];
