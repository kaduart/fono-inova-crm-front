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
