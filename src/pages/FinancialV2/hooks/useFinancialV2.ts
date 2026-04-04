import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';

export interface FinancialV2Totals {
    totalReceived: number;
    totalProduction: number;
    totalPending: number;
    countReceived: number;
    countPending: number;
    particularReceived: number;
    insurance: {
        pendingBilling: number;
        billed: number;
        received: number;
    };
    packageCredit: {
        contractedRevenue: number;
        cashReceived: number;
        deferredRevenue: number;
        deferredSessions: number;
        recognizedRevenue: number;
        recognizedSessions: number;
        totalSessions: number;
        activePackages: number;
    };
    patientBalance: {
        totalDebt: number;
        totalCredit: number;
        totalDebited: number;
        totalCredited: number;
        patientsWithDebt: number;
        patientsWithCredit: number;
    };
}

export interface FinancialV2Validation {
    type: 'error' | 'warning' | 'insight';
    code: string;
    message: string;
    details?: Record<string, any>;
}

export interface FinancialV2Data {
    totals: FinancialV2Totals;
    period: string;
    date: string;
    periodStart: string;
    periodEnd: string;
    source: string;
    backgroundUpdate: boolean;
    blockingErrors?: FinancialV2Validation[];
    warnings?: FinancialV2Validation[];
}

interface UseFinancialV2Options {
    period?: 'day' | 'week' | 'month' | 'year';
    date?: string;
    enabled?: boolean;
}

const fetchFinancialV2 = async (period: string, date?: string): Promise<FinancialV2Data> => {
    const params: Record<string, string> = { period };
    if (date) params.date = date;
    
    // API já tem /api no baseURL
    const response = await API.get('/v2/totals', { params });
    return response.data.data;
};

export const useFinancialV2 = (options: UseFinancialV2Options = {}) => {
    const { period = 'month', date, enabled = true } = options;
    
    return useQuery({
        queryKey: ['financialV2', period, date],
        queryFn: () => fetchFinancialV2(period, date),
        enabled,
        refetchInterval: 30000,
        staleTime: 15000,
    });
};

// 🧠 KPIs Calculados
export const useFinancialKPIs = (data?: FinancialV2Totals) => {
    if (!data) return null;
    
    const packageExecutionRate = data.packageCredit.contractedRevenue > 0
        ? (data.packageCredit.recognizedRevenue / data.packageCredit.contractedRevenue) * 100
        : 0;
    
    const estimatedCapacity = 400;
    const operationalRisk = (data.packageCredit.deferredSessions / estimatedCapacity) * 100;
    
    const defaultRate = data.totalProduction > 0
        ? (data.patientBalance.totalDebt / data.totalProduction) * 100
        : 0;
    
    const cashEfficiency = data.totalProduction > 0
        ? (data.totalReceived / data.totalProduction) * 100
        : 0;
    
    return {
        packageExecutionRate,
        operationalRisk,
        defaultRate,
        cashEfficiency,
        operationalRiskStatus: operationalRisk > 80 ? 'critical' : operationalRisk > 50 ? 'warning' : 'good',
        defaultRateStatus: defaultRate > 10 ? 'critical' : defaultRate > 5 ? 'warning' : 'good',
        cashEfficiencyStatus: cashEfficiency > 90 ? 'good' : cashEfficiency > 70 ? 'warning' : 'critical',
    };
};

// 📊 Dados para Gráficos
export const useChartData = (data?: FinancialV2Totals) => {
    if (!data) return null;
    
    return {
        productionMix: [
            { name: 'Particular', value: data.particularReceived, color: '#3b82f6' },
            { name: 'Convênio', value: data.insurance.pendingBilling + data.insurance.billed + data.insurance.received, color: '#8b5cf6' },
            { name: 'Pacote', value: data.packageCredit.recognizedRevenue, color: '#ec4899' },
        ].filter(item => item.value > 0),
        
        packageStatus: [
            { name: 'Consumido', value: data.packageCredit.recognizedSessions, color: '#10b981' },
            { name: 'Restante', value: data.packageCredit.deferredSessions, color: '#f59e0b' },
        ],
        
        insuranceStatus: [
            { name: 'A Faturar', value: data.insurance.pendingBilling, color: '#f59e0b' },
            { name: 'Faturado', value: data.insurance.billed, color: '#3b82f6' },
            { name: 'Recebido', value: data.insurance.received, color: '#10b981' },
        ].filter(item => item.value > 0),
    };
};
