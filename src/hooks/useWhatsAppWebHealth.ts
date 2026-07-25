import { useEffect, useState, useCallback } from 'react';
import {
    fetchWhatsAppWebHealth,
    cleanupWhatsAppWebCache,
    type WhatsAppWebHealthResponse,
} from '../services/whatsappService';

export interface WhatsAppWebHealthState {
    data: WhatsAppWebHealthResponse | null;
    loading: boolean;
    error: string | null;
}

const POLL_INTERVAL = 15_000;

export function useWhatsAppWebHealth(enabled = true) {
    const [state, setState] = useState<WhatsAppWebHealthState>({
        data: null,
        loading: true,
        error: null,
    });

    const fetchHealth = useCallback(async () => {
        try {
            const data = await fetchWhatsAppWebHealth();
            setState((prev) => ({ ...prev, data, error: null, loading: false }));
        } catch (err: any) {
            setState((prev) => ({
                ...prev,
                error: err?.response?.data?.error || err?.message || 'Erro ao consultar saúde do WhatsApp',
                loading: false,
            }));
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        fetchHealth();
        const id = setInterval(fetchHealth, POLL_INTERVAL);
        return () => clearInterval(id);
    }, [fetchHealth, enabled]);

    const cleanupCache = useCallback(async () => {
        const result = await cleanupWhatsAppWebCache();
        await fetchHealth();
        return result;
    }, [fetchHealth]);

    return {
        ...state,
        refresh: fetchHealth,
        cleanupCache,
    };
}
