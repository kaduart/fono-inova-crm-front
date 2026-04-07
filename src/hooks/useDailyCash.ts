/**
 * 💰 Hook para Fechamento de Caixa Diário
 * Só carrega dados quando o modal abre (lazy loading)
 */

import { useState, useCallback } from 'react';
import API from '../services/api';

interface Payment {
    _id: string;
    patientName?: string;
    patientId?: string;
    amount: number;
    method: string;
    billingType?: string;
    paymentDate: string;
    status: string;
    createdAt: string;
}

interface DailyCashData {
    total: number;
    count: number;
    porMetodo: {
        pix: number;
        cartao: number;
        dinheiro: number;
        convenio: number;
        outros: number;
    };
    porTipo: {
        particular: number;
        convenio: number;
        pacote: number;
    };
    lista: Payment[];
}

export const useDailyCash = () => {
    const [data, setData] = useState<DailyCashData>({
        total: 0,
        count: 0,
        porMetodo: { pix: 0, cartao: 0, dinheiro: 0, convenio: 0, outros: 0 },
        porTipo: { particular: 0, convenio: 0, pacote: 0 },
        lista: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 🆕 Só busca quando chamar essa função (ao abrir modal)
    const fetchDailyCash = useCallback(async (date: string) => {
        setLoading(true);
        setError(null);
        
        try {
            // Usa endpoint correto do backend
            const res = await API.get('/payments/daily-payments-details', {
                params: { date }
            });

            const payments: Payment[] = res.data?.payments || res.data?.data || [];

            // Calcula totais
            const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
            
            // Agrupa por método
            const porMetodo = {
                pix: 0,
                cartao: 0,
                dinheiro: 0,
                convenio: 0,
                outros: 0
            };

            // Agrupa por tipo
            const porTipo = {
                particular: 0,
                convenio: 0,
                pacote: 0
            };

            payments.forEach((p) => {
                const amount = p.amount || 0;
                const method = (p.method || p.paymentMethod || '').toLowerCase();
                const billingType = (p.billingType || '').toLowerCase();

                // Por método
                if (method.includes('pix')) {
                    porMetodo.pix += amount;
                } else if (method.includes('card') || method.includes('cartão') || method.includes('credito') || method.includes('debito')) {
                    porMetodo.cartao += amount;
                } else if (method.includes('cash') || method.includes('dinheiro')) {
                    porMetodo.dinheiro += amount;
                } else if (billingType === 'convenio' || method.includes('convenio')) {
                    porMetodo.convenio += amount;
                } else {
                    porMetodo.outros += amount;
                }

                // Por tipo
                if (billingType === 'convenio' || method.includes('convenio')) {
                    porTipo.convenio += amount;
                } else if (billingType === 'pacote' || billingType === 'package') {
                    porTipo.pacote += amount;
                } else {
                    porTipo.particular += amount;
                }
            });

            setData({
                total,
                count: payments.length,
                porMetodo,
                porTipo,
                lista: payments
            });

        } catch (err: any) {
            console.error('Erro ao carregar caixa do dia:', err);
            setError(err.response?.data?.message || 'Erro ao carregar caixa');
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        ...data,
        loading,
        error,
        fetchDailyCash
    };
};

export default useDailyCash;
