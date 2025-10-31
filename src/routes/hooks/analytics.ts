import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { analyticsService, GAEvent, GAMetrics } from '../../services/analytics.js';

interface UseAnalyticsProps {
    startDate?: string;
    endDate?: string;
}

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
