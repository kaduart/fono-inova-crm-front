// src/hooks/useFollowupAnalytics.ts
import { useCallback, useEffect, useState } from 'react';
import { followupService } from '../../services/followupService';

export const useFollowupAnalytics = () => {
    const [state, setState] = useState({
        data: null as any,
        loading: true,
        error: null as string | null
    });

    const fetchData = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));

            const [statsResponse, trendResponse, conversionResponse] = await Promise.all([
                followupService.getMetrics(),
                followupService.getTrend(7),
                followupService.getConversionByOrigin()
            ]);

            // Verifica se TODAS as respostas foram bem sucedidas
            if (statsResponse.success && trendResponse.success && conversionResponse.success) {
                setState({
                    data: {
                        stats: statsResponse.data,
                        trend: trendResponse.data,
                        conversion: conversionResponse.data
                    },
                    loading: false,
                    error: null
                });
            } else {
                // Se alguma falhou, mostra erro
                const errorMessage =
                    statsResponse.error?.message ||
                    trendResponse.error?.message ||
                    conversionResponse.error?.message ||
                    'Erro ao carregar analytics';

                throw new Error(errorMessage);
            }
        } catch (err: any) {
            setState({
                data: null,
                loading: false,
                error: err.message || 'Erro ao carregar analytics'
            });
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data: state.data,
        loading: state.loading,
        error: state.error,
        refetch: fetchData
    };
};