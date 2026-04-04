import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';

export interface IntelligenceData {
    period: {
        month: number;
        year: number;
        daysInMonth: number;
        daysElapsed: number;
        daysRemaining: number;
        isCurrentMonth: boolean;
    };
    metas: {
        mensal: number;
        diaria: number;
        semanal: number;
    };
    realizado: {
        mensal: number;
        semanal: number;
        diario: number;
        aReceber: number;
        agendadosConfirmados: number;
    };
    progresso: {
        percentual: number;
        status: 'no_goal' | 'achieved' | 'on_track' | 'at_risk' | 'behind';
        gap: number;
    };
    ritmo: {
        atual: number;
        necessario: number;
        diferenca: number;
        isOnTrack: boolean;
    };
    gap: {
        mensal: number;
        semanal: number;
        diario: number;
        sessoesNecessarias: number;
        pacotesNecessarios: number;
        ticketMedio: number;
        valorPacote: number;
    };
    projecao: {
        pessimista: number;
        realista: number;
        otimista: number;
        vsMeta: number;
    };
}

export const useIntelligence = (month?: number, year?: number) => {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();
    
    return useQuery({
        queryKey: ['intelligence', targetMonth, targetYear],
        queryFn: async (): Promise<IntelligenceData> => {
            const { data } = await API.get('/v2/intelligence', {
                params: { month: targetMonth, year: targetYear }
            });
            return data.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
};
