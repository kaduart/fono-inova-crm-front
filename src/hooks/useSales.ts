import { useCallback, useState } from 'react';
import api from '../services/api';
import { invalidateCache } from '../utils/cacheManager';

export interface Sale {
    _id: string;
    patient: { _id: string; fullName: string };
    doctor: { _id: string; fullName: string; specialty?: string };
    tipoVenda: 'pacote' | 'sessao_avulsa' | 'produto' | 'servico' | 'avaliacao';
    package?: { _id: string; sessionType: string; totalSessions: number };
    produtoServico?: { _id: string; nome: string; categoria: string; valorVenda: number };
    dataVenda: string;
    dataAgendamento?: string;
    valorBruto: number;
    desconto: number;
    valorLiquido: number;
    formaPagamento: 'dinheiro' | 'pix' | 'debito' | 'credito_1x' | 'credito_parcelado' | 'boleto' | 'transferencia';
    parcelas: number;
    bandeiraCartao?: 'visa' | 'mastercard' | 'elo' | 'amex' | 'diners' | 'outros';
    status: 'agendado' | 'confirmado' | 'realizado' | 'cancelado';
    custosVariaveis: Array<{
        tipo: string;
        valor: number;
        percentual?: number;
        descricao: string;
    }>;
    totalCustosVariaveis: number;
    margemContribuicao: number;
    createdAt: string;
}

interface CreateSaleDTO {
    patient: string;
    doctor: string;
    tipoVenda: string;
    package?: string;
    produtoServico?: string;
    dataVenda: string;
    dataAgendamento?: string;
    valorBruto: number;
    desconto: number;
    valorLiquido: number;
    formaPagamento: string;
    parcelas: number;
    bandeiraCartao?: string;
}

export const useSales = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [simulacao, setSimulacao] = useState<any>(null);

    const fetchSales = useCallback(async (filters?: { month?: number; year?: number; status?: string }) => {
        setLoading(true);
        try {
            let url = '/sales';
            if (filters) {
                const params = new URLSearchParams();
                if (filters.month) params.append('month', filters.month.toString());
                if (filters.year) params.append('year', filters.year.toString());
                if (filters.status) params.append('status', filters.status);
                url += `?${params.toString()}`;
            }
            const response = await api.get(url);
            setSales(response.data.data);
            return response.data.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao buscar vendas');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createSale = useCallback(async (data: CreateSaleDTO) => {
        setLoading(true);
        try {
            const response = await api.post('/sales', data);
            setSales(prev => [response.data.data, ...prev]);
            
            // 🚀 Invalida dashboard pois vendas afetam o financeiro
            invalidateCache('dashboard');
            invalidateCache('patients');
            
            return response.data.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao criar venda');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const simularVenda = useCallback(async (data: {
        valor: number;
        formaPagamento: string;
        bandeiraCartao?: string;
        parcelas: number;
        produtoId: string;
    }) => {
        try {
            const response = await api.post('/provisionamento/simular', data);
            setSimulacao(response.data.simulacao);
            return response.data.simulacao;
        } catch (err) {
            console.error('Erro na simulação:', err);
            return null;
        }
    }, []);

    const getSaleById = useCallback(async (id: string) => {
        try {
            const response = await api.get(`/sales/${id}`);
            return response.data.data;
        } catch (err) {
            console.error('Erro ao buscar venda:', err);
            return null;
        }
    }, []);

    const updateSaleStatus = useCallback(async (id: string, status: string) => {
        try {
            const response = await api.patch(`/sales/${id}/status`, { status });
            setSales(prev => prev.map(s => s._id === id ? response.data.data : s));
            
            // 🚀 Invalida dashboard pois status de venda afeta o financeiro
            invalidateCache('dashboard');
            
            return response.data.data;
        } catch (err) {
            console.error('Erro ao atualizar status:', err);
            throw err;
        }
    }, []);

    return {
        sales,
        loading,
        error,
        simulacao,
        fetchSales,
        createSale,
        simularVenda,
        getSaleById,
        updateSaleStatus
    };
};