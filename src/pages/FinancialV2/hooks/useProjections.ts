import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';

export interface ProjectionPeriod {
    month: number;
    year: number;
    daysInMonth: number;
    daysElapsed: number;
    daysRemaining: number;
    isCurrentMonth: boolean;
    isPastMonth: boolean;
}

export interface ProjectionMeta {
    value: number;
    percentualAtingido: number;
    gap: number;
    status: 'no_meta' | 'achieved' | 'on_track' | 'at_risk' | 'behind';
    mensagem: string;
}

export interface ProjectionAtual {
    received: number;
    production: number;
    aReceber: number;
    agendadosConfirmados: number;
    agendadosPendentes: number;
}

export interface ProjectionRitmo {
    atual: number;
    necessario: number;
    isOnTrack: boolean;
}

export interface ProjectionCenarios {
    pessimista: number;
    realista: number;
    otimista: number;
    vsMeta: number;
}

export interface ProjectionsData {
    period: ProjectionPeriod;
    meta: ProjectionMeta;
    atual: ProjectionAtual;
    ritmo: ProjectionRitmo;
    projecao: ProjectionCenarios;
}

interface UseProjectionsOptions {
    month?: number;
    year?: number;
    enabled?: boolean;
}

const fetchProjections = async (month?: number, year?: number): Promise<ProjectionsData> => {
    const params: Record<string, string> = {};
    if (month) params.month = String(month);
    if (year) params.year = String(year);
    
    const response = await API.get('/v2/projections', { params });
    return response.data.data;
};

export const useProjections = (options: UseProjectionsOptions = {}) => {
    const { month, year, enabled = true } = options;
    
    return useQuery({
        queryKey: ['projections', month, year],
        queryFn: () => fetchProjections(month, year),
        enabled,
        refetchInterval: 60000,
        staleTime: 30000,
    });
};

// 📊 Status formatado para UI
export const useProjectionStatus = (data?: ProjectionsData) => {
    if (!data) return null;
    
    const { meta, ritmo, projecao } = data;
    
    const statusConfig = {
        achieved: { color: '#10b981', label: 'Meta Atingida', icon: '🏆' },
        on_track: { color: '#3b82f6', label: 'No Caminho', icon: '✅' },
        at_risk: { color: '#f59e0b', label: 'Atenção', icon: '⚠️' },
        behind: { color: '#ef4444', label: 'Abaixo do Esperado', icon: '🚨' },
        no_meta: { color: '#6b7280', label: 'Sem Meta', icon: '📝' },
    };
    
    const config = statusConfig[meta.status];
    
    return {
        ...config,
        percentual: meta.percentualAtingido,
        gap: meta.gap,
        ritmoAtual: ritmo.atual,
        ritmoNecessario: ritmo.necessario,
        projecaoRealista: projecao.realista,
        projecaoVsMeta: projecao.vsMeta,
        diasRestantes: data.period.daysRemaining,
    };
};

// 📈 Dados para gráfico simples
export const useProjectionChartData = (data?: ProjectionsData) => {
    if (!data) return null;
    
    const { meta, atual, projecao, period } = data;
    
    return {
        meta: meta.value,
        atual: atual.received,
        projecao: projecao.realista,
        gap: meta.gap,
        percentual: meta.percentualAtingido,
        diasDecorridos: period.daysElapsed,
        diasTotais: period.daysInMonth,
        // Para gráfico de progresso
        series: [
            { name: 'Recebido', value: atual.received, color: '#3b82f6' },
            { name: 'A Receber', value: atual.aReceber, color: '#f59e0b' },
            { name: 'Gap p/ Meta', value: Math.max(0, meta.gap), color: '#e5e7eb' },
        ].filter(s => s.value > 0),
    };
};
