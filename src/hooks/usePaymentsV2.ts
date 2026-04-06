// src/hooks/usePaymentsV2.ts
/**
 * Hook V2 para Payments (Projection otimizada)
 * Substitui usePayment com performance superior
 */

import { useCallback, useRef, useState } from 'react';
import API from '../services/api';

export interface PaymentV2 {
    _id: string;
    viewId: string;
    date: string;
    patient: {
        _id: string;
        fullName: string;
        phone?: string;
    };
    doctor: {
        _id: string;
        fullName: string;
        specialty: string;
    };
    serviceType: string;
    serviceLabel: string;
    specialty: string;
    amount: number;
    paymentMethod: string;
    paymentMethodLabel: string;
    status: 'paid' | 'pending' | 'partial' | 'canceled';
    category: 'particular' | 'package' | 'insurance' | 'expense';
    notes: string;
    createdAt: string;
    appointment?: { _id: string } | null;
    package?: { _id: string } | null;
}

export interface PaymentsMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
    executionTime: string;
}

export interface PaymentsSummary {
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
}

export interface PaymentsResponse {
    success: boolean;
    meta: PaymentsMeta;
    summary: PaymentsSummary;
    data: PaymentV2[];
}

export interface PaymentsFilters {
    month?: string;        // YYYY-MM
    startDate?: string;    // YYYY-MM-DD
    endDate?: string;      // YYYY-MM-DD
    status?: 'paid' | 'pending' | 'partial' | 'all';
    category?: 'particular' | 'package' | 'insurance' | 'expense' | 'all';
    method?: 'pix' | 'cash' | 'card' | 'insurance' | 'all';
    search?: string;
    page?: number;
    limit?: number;
}

// Cache local
const CACHE_DURATION = 60 * 1000; // 1 minuto
const cache: {
    key: string | null;
    data: PaymentsResponse | null;
    timestamp: number | null;
} = {
    key: null,
    data: null,
    timestamp: null
};

function generateCacheKey(filters: PaymentsFilters): string {
    return JSON.stringify(filters);
}

export const usePaymentsV2 = () => {
    const [payments, setPayments] = useState<PaymentV2[]>([]);
    const [meta, setMeta] = useState<PaymentsMeta | null>(null);
    const [summary, setSummary] = useState<PaymentsSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Busca pagamentos da projection V2
     */
    const fetchPayments = useCallback(async (
        filters: PaymentsFilters = {},
        options: { forceRefresh?: boolean; signal?: AbortSignal } = {}
    ): Promise<PaymentsResponse> => {
        const cacheKey = generateCacheKey(filters);
        const now = Date.now();
        
        // Usa cache se válido
        if (!options.forceRefresh && 
            cache.key === cacheKey && 
            cache.data && 
            cache.timestamp && 
            (now - cache.timestamp < CACHE_DURATION)) {
            setPayments(cache.data.data);
            setMeta(cache.data.meta);
            setSummary(cache.data.summary);
            return cache.data;
        }
        
        // Cancela requisição anterior
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        
        setLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams();
            
            if (filters.month) params.set('month', filters.month);
            if (filters.startDate) params.set('startDate', filters.startDate);
            if (filters.endDate) params.set('endDate', filters.endDate);
            if (filters.status && filters.status !== 'all') params.set('status', filters.status);
            if (filters.category && filters.category !== 'all') params.set('category', filters.category);
            if (filters.method && filters.method !== 'all') params.set('method', filters.method);
            if (filters.search) params.set('search', filters.search);
            params.set('page', String(filters.page || 1));
            params.set('limit', String(Math.min(200, filters.limit || 50)));
            
            const response = await API.get<PaymentsResponse>(`/v2/payments?${params.toString()}`, {
                signal: options.signal || abortControllerRef.current.signal
            });
            
            if (response.data.success) {
                setPayments(response.data.data);
                setMeta(response.data.meta);
                setSummary(response.data.summary);
                
                // Atualiza cache
                cache.key = cacheKey;
                cache.data = response.data;
                cache.timestamp = Date.now();
                
                return response.data;
            } else {
                throw new Error(response.data.error || 'Erro ao buscar pagamentos');
            }
            
        } catch (err: any) {
            if (err.name === 'AbortError' || err.name === 'CanceledError') {
                console.log('[usePaymentsV2] Requisição cancelada');
                throw err;
            }
            
            const message = err.response?.data?.error || err.message || 'Erro ao buscar pagamentos';
            setError(message);
            throw err;
            
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Busca um pagamento específico
     */
    const fetchPayment = useCallback(async (id: string): Promise<PaymentV2 | null> => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await API.get<{ success: boolean; data: PaymentV2 }>(`/v2/payments/${id}`);
            
            if (response.data.success) {
                return response.data.data;
            }
            return null;
            
        } catch (err: any) {
            const message = err.response?.data?.error || err.message;
            setError(message);
            return null;
            
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Invalida cache
     */
    const invalidateCache = useCallback(() => {
        cache.key = null;
        cache.data = null;
        cache.timestamp = null;
    }, []);

    /**
     * Reconstroi projection (admin)
     */
    const rebuildProjection = useCallback(async (): Promise<{ success: boolean; message: string }> => {
        setLoading(true);
        
        try {
            const response = await API.post('/v2/payments/rebuild');
            invalidateCache();
            return response.data;
            
        } catch (err: any) {
            const message = err.response?.data?.error || err.message;
            setError(message);
            throw err;
            
        } finally {
            setLoading(false);
        }
    }, [invalidateCache]);

    return {
        payments,
        meta,
        summary,
        loading,
        error,
        fetchPayments,
        fetchPayment,
        invalidateCache,
        rebuildProjection
    };
};

export default usePaymentsV2;
