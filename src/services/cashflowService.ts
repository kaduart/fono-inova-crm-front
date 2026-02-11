// src/services/cashflowService.ts
import API from './api';

export interface CashflowSummaryData {
    revenue: {
        total: number;
        count: number;
    };
    expenses: {
        total: number;
        count: number;
    };
    balance: number;
    balanceStatus: 'positive' | 'negative';

    // NOVO: Atividade do período
    atividade?: {
        agendamentosCriados: {
            count: number;
            valorPotencial: number;
            itens: Array<{
                id: string;
                paciente: string;
                profissional: string;
                especialidade: string;
                dataAgendada: string;
                hora: string;
                valor: number;
                criadoEm: string;
            }>;
        };
        pacotesCriados: {
            count: number;
            valorPotencial: number;
            itens: Array<{
                id: string;
                paciente: string;
                profissional: string;
                especialidade: string;
                sessoes: number;
                valor: number;
                criadoEm: string;
            }>;
        };
        movimentacaoTotal: number;
    };
}

export interface CashflowSummary {
    success: boolean;
    period: {
        startDate: string;
        endDate: string;
    };
    data: CashflowSummaryData;
}

interface CashflowSummaryParams {
    period: 'day' | 'week' | 'month' | 'year';
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
}

export const cashflowService = {
    getSummary(params: CashflowSummaryParams) {
        return API.get<CashflowSummary>('/cashflow/summary', { params });
    },
};
