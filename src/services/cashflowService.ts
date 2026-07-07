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
    receitaReal?: number;
    receitaDiferida?: number;
    caixa: {
        total: number;
        pix: number;
        dinheiro: number;
        cartao: number;
        transferencia: number;
        outros: number;
        qtdPix: number;
        qtdDinheiro: number;
        qtdCartao: number;
    };
    porTipo: {
        particular: number;
        pacote: number;
        convenio: number;
        liminar: number;
    };
    porEspecialidade: Record<string, number>;
    despesas: {
        total: number;
        porCategoria: Record<string, number>;
        quantidade: number;
        breakdown?: {
            expenses: number;
            comissoes: number;
            semRegra: number;
            detalheComissoes: Array<{
                doctorId: string;
                doctorName: string;
                total: number;
                sessions: number;
                productionBase: number;
                commissionRate: number;
                lastUpdated: string;
                noRule: boolean;
            }>;
        };
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
            liminar: number;
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
        profissional?: string;
        hora: string;
        data: string;
        categoria: string;
        observacao?: string;
        billingType?: string;
        kind?: string;
        package?: boolean;
        appointmentStatus?: string;
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
    liminaresAtendidos: Array<{
        id: string;
        horario: string;
        paciente: string;
        servico: string;
        especialidade: string;
        professional: string;
        valor: number;
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

// Deduplicação de requests concorrentes idênticos (evita múltiplos fetches no mount)
const _inflight = new Map<string, Promise<any>>();
function deduped<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (_inflight.has(key)) {
        console.debug('[cashflow INFLIGHT REUSE]', key);
        return _inflight.get(key)!;
    }
    console.debug('[cashflow FETCH]', key);
    const p = fn().finally(() => _inflight.delete(key));
    _inflight.set(key, p);
    return p;
}

export const cashflowService = {
    getSummary(params: CashflowSummaryParams) {
        return API.get<CashflowSummary>('/cashflow/summary', { params });
    },

    getDailyCashflow(date?: string) {
        const key = `cashflow:${date || 'today'}`;
        return deduped(key, () => API.get<CashflowV2Response>('/v2/cashflow', {
            params: date ? { date } : undefined
        }));
    },

    getCashflowRange(startDate: string, endDate: string) {
        const key = `cashflow-range:${startDate}:${endDate}`;
        return deduped(key, () => API.get<CashflowV2Response>('/v2/cashflow', {
            params: { startDate, endDate }
        }));
    },

    getMonthlyCashflow(month: string) {
        const key = `cashflow-month:${month}`;
        return deduped(key, () => API.get<{ success: boolean; month: string; data: { date: string; caixa: number; producao: number; atendimentos: number }[] }>('/v2/cashflow/month', {
            params: { month }
        }));
    },

    getDayAppointments(date: string) {
        const key = `appointments:${date}`;
        return deduped(key, () => API.get<{ success: boolean; data: { appointments: any[]; pagination: any } }>('/v2/appointments', {
            params: { startDate: date, endDate: date, limit: 500 }
        }));
    },
};
