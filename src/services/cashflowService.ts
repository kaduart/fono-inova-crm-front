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

// 🆕 NOVO: Interface para o endpoint V2 de caixa diário
export interface CashflowV2Data {
    data: string;
    caixa: {
        total: number;
        pix: number;
        dinheiro: number;
        cartao: number;
        outros: number;
        qtdPix: number;
        qtdDinheiro: number;
        qtdCartao: number;
    };
    porTipo: {
        particular: number;
        pacote: number;
        convenio: number;
    };
    porEspecialidade: Record<string, number>;
    despesas: {
        total: number;
        porCategoria: Record<string, number>;
        quantidade: number;
    };
    saldo: {
        bruto: number;
        liquido: number;
        despesaTotal: number;
    };
    producao: {
        total: number;
        aReceber: number;
        recebido: number;
        quantidadeAtendimentos: number;
        ticketMedio: number;
        taxaEficiencia: number;
        porTipo: {
            particular: number;
            pacote: number;
            convenio: number;
        };
        porEspecialidade: Array<{
            nome: string;
            total: number;
            quantidade: number;
            recebido: number;
            pendente: number;
            ticketMedio: string;
        }>;
    };
    pendentesCobranca: Array<{
        id: string;
        paciente: string;
        telefone: string;
        valor: number;
        horario: string;
        especialidade: string;
        professional: string;
        tipo: string;
        convenio: string | null;
    }>;
    comparativos: {
        ontem: number;
        variacaoVsOntem: number;
        mediaDiariaMes: number;
        vsMediaMes: number;
        totalAcumuladoMes: number;
        projecaoMes: number;
        diasDecorridos: number;
    };
    estatisticas: {
        quantidade: number;
        quantidadeAtendimentos: number;
        ticketMedio: number;
        ontem: number;
    };
    transacoes: Array<{
        id: string;
        paciente: string;
        valor: number;
        metodo: string;
        tipo: string;
        servico: string;
        especialidade: string;
        hora: string;
        data: string;
        categoria: string;
    }>;
    transacoesProducao: Array<{
        id: string;
        paciente: string;
        valor: number;
        metodo: string;
        tipo: string;
        servico: string;
        especialidade: string;
        hora: string;
        data: string;
        status: string;
        categoria: string;
        professional: string;
    }>;
    pacotesAtendidos: Array<{
        id: string;
        horario: string;
        paciente: string;
        servico: string;
        especialidade: string;
        professional: string;
        valor: number;
        statusPagamento: string;
    }>;
    conveniosAtendidos: Array<{
        id: string;
        horario: string;
        paciente: string;
        servico: string;
        especialidade: string;
        professional: string;
        valor: number;
        convenio: string;
    }>;
}

export interface CashflowV2Response {
    success: boolean;
    data: CashflowV2Data;
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
    
    // 🆕 NOVO: Endpoint V2 para caixa diário
    getDailyCashflow(date?: string) {
        return API.get<CashflowV2Response>('/v2/cashflow', { 
            params: date ? { date } : undefined 
        });
    },

    // 🆕 NOVO: Endpoint V2 para caixa mensal (substitui 30 chamadas diárias)
    getMonthlyCashflow(month: string) {
        return API.get<{ success: boolean; month: string; data: { date: string; caixa: number; producao: number; atendimentos: number }[] }>('/v2/cashflow/month', {
            params: { month }
        });
    },
};
