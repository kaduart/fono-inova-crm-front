/**
 * useLazyTab - Hook para Lazy Loading de Abas
 * 
 * Gerencia o carregamento de dados por aba com cache.
 * Só carrega dados quando a aba é ativada pela primeira vez.
 * Mantém os dados em cache para não recarregar ao voltar para a aba.
 * 
 * Uso:
 * const { data, loading, load } = useLazyTab('dashboard', fetchDashboardData);
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyTabOptions<T> {
    // Função para carregar dados
    fetchFn: () => Promise<T>;
    // Se deve carregar automaticamente quando ativado
    autoLoad?: boolean;
    // Tempo de cache em ms (padrão: 5 minutos)
    cacheDuration?: number;
}

interface UseLazyTabReturn<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    load: () => Promise<void>;
    refresh: () => Promise<void>;
    clearCache: () => void;
}

// Cache global entre instâncias
const globalCache: Record<string, {
    data: any;
    timestamp: number;
}> = {};

export function useLazyTab<T>(
    tabId: string,
    options: UseLazyTabOptions<T>
): UseLazyTabReturn<T> {
    const { fetchFn, autoLoad = true, cacheDuration = 5 * 60 * 1000 } = options;
    
    const [data, setData] = useState<T | null>(globalCache[tabId]?.data || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    const isMounted = useRef(true);
    const isLoadingRef = useRef(false);

    // Verifica se tem cache válido
    const hasValidCache = useCallback(() => {
        const cached = globalCache[tabId];
        if (!cached) return false;
        
        const now = Date.now();
        return (now - cached.timestamp) < cacheDuration;
    }, [tabId, cacheDuration]);

    // Carrega dados
    const load = useCallback(async (force = false) => {
        // Se já está carregando, não inicia outro
        if (isLoadingRef.current) return;
        
        // Se tem cache válido e não é forçado, usa cache
        if (!force && hasValidCache()) {
            setData(globalCache[tabId].data);
            return;
        }

        isLoadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const result = await fetchFn();
            
            if (!isMounted.current) return;

            // Salva no cache global
            globalCache[tabId] = {
                data: result,
                timestamp: Date.now()
            };

            setData(result);
        } catch (err) {
            if (!isMounted.current) return;
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            if (isMounted.current) {
                setLoading(false);
                isLoadingRef.current = false;
            }
        }
    }, [fetchFn, tabId, hasValidCache]);

    // Força refresh (ignora cache)
    const refresh = useCallback(() => load(true), [load]);

    // Limpa cache desta aba
    const clearCache = useCallback(() => {
        delete globalCache[tabId];
        setData(null);
    }, [tabId]);

    // Auto-load na montagem
    useEffect(() => {
        if (autoLoad && !hasValidCache()) {
            load();
        }

        return () => {
            isMounted.current = false;
        };
    }, [autoLoad, load, hasValidCache]);

    return {
        data,
        loading,
        error,
        load,
        refresh,
        clearCache
    };
}

/**
 * Hook para gerenciar múltiplas abas com lazy loading
 * 
 * Uso:
 * const tabs = useLazyTabs();
 * 
 * tabs.register('dashboard', fetchDashboard);
 * tabs.register('financial', fetchFinancial);
 * 
 * // Na aba ativa:
 * const { data, loading } = tabs.useTab('dashboard');
 */
export function useLazyTabs() {
    const [activeTab, setActiveTab] = useState<string>('');
    const registeredTabs = useRef<Record<string, () => Promise<any>>>({});

    const register = useCallback((tabId: string, fetchFn: () => Promise<any>) => {
        registeredTabs.current[tabId] = fetchFn;
    }, []);

    const activate = useCallback((tabId: string) => {
        setActiveTab(tabId);
    }, []);

    const useTab = <T,>(tabId: string) => {
        const fetchFn = registeredTabs.current[tabId];
        
        if (!fetchFn) {
            throw new Error(`Tab "${tabId}" not registered. Call tabs.register('${tabId}', fetchFn) first.`);
        }

        const lazyTab = useLazyTab<T>(tabId, {
            fetchFn,
            autoLoad: tabId === activeTab
        });

        return lazyTab;
    };

    return {
        register,
        activate,
        useTab,
        activeTab
    };
}

export default useLazyTab;
