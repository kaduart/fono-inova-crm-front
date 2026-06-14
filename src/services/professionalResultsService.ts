// src/services/professionalResultsService.ts
import API from './api';

export interface ReceivablesBreakdown {
  total: number;
  particular: number;
  insurance: number;
  liminar: number;
  packageConsumed: number;
}

export interface ProfessionalRankingItem {
  doctorId: string;
  doctorName: string;
  specialty?: string;
  patients: {
    active: number;
    new: number;
    inactive: number;
    total: number;
  };
  production: {
    total: number;
    particular: number;
    pacote: number;
    convenio: number;
    liminar: number;
  };
  received: {
    total: number;
    particular: number;
    convenio: number;
    liminar: number;
    packageSales: number;
    sessionCash: number;
  };
  commission: number;
  advances: number;
  balance: number;
  receivables: ReceivablesBreakdown;
  rank?: number;
}

export interface ProfessionalSummary {
  doctorId: string;
  doctorName: string;
  specialty?: string;
  period: { start: string; end: string };
  patients: {
    active: number;
    new: number;
    inactive: number;
    total: number;
  };
  sessions: {
    completed: number;
    withoutImmediatePayment: number;
    breakdown: {
      package: number;
      packageCount: number;
      insurance: number;
      insuranceCount: number;
      liminar: number;
      liminarCount: number;
      privatePending: number;
      privatePendingCount: number;
      realIssues: number;
    };
  };
  production: {
    total: number;
    particular: number;
    pacote: number;
    convenio: number;
    liminar: number;
  };
  received: {
    total: number;
    particular: number;
    convenio: number;
    liminar: number;
    packageSales: number;
    sessionCash: number;
  };
  pending: number;
  receivables: ReceivablesBreakdown;
  commission: number;
  advances: number;
  balance: number;
  health: {
    orphanSessions: number;
    orphanPayments: number;
    hasCommissionData: boolean;
  };
}

export interface PatientBreakdownItem {
  patientId: string;
  patientName: string;
  sessionsCompleted: number;
  sessionsCancelled: number;
  sessionsMissed: number;
  sessionsScheduled: number;
  production: number;
  received: number;
  pending: number;
  commission: number;
  lastSession: string | null;
  nextSession: string | null;
}

export interface SettlementItem {
  _id: string;
  periodMonth: number;
  periodYear: number;
  status: 'closed' | 'cancelled';
  snapshot: {
    patients?: unknown;
    sessions?: unknown;
    production?: unknown;
    received?: unknown;
    pending?: number;
    commission: number;
    advances: number;
    balance: number;
  };
  closedAt?: string;
  cancelledAt?: string;
}

export interface FinancialIssue {
  type: 'orphan_payment' | 'orphan_session' | 'private_pending' | 'commission_mismatch' | 'missing_doctor';
  severity: 'high' | 'medium' | 'low';
  category?: string;
  doctorId?: string;
  doctorName?: string;
  patientId?: string;
  patientName?: string;
  amount?: number;
  description: string;
  date?: string;
  entityId?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

function buildDateParams(startDate?: string, endDate?: string): string {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  return params.toString();
}

export const professionalResultsService = {
  async getRanking(startDate?: string, endDate?: string): Promise<ProfessionalRankingItem[]> {
    const query = buildDateParams(startDate, endDate);
    const response = await API.get<ApiResponse<ProfessionalRankingItem[]>>(`/v2/professionals/ranking${query ? `?${query}` : ''}`);
    return response.data.data;
  },

  async getSummary(doctorId: string, startDate?: string, endDate?: string): Promise<ProfessionalSummary> {
    const query = buildDateParams(startDate, endDate);
    const response = await API.get<ApiResponse<ProfessionalSummary>>(`/v2/professionals/${doctorId}/summary${query ? `?${query}` : ''}`);
    return response.data.data;
  },

  async getPatientsBreakdown(doctorId: string, startDate?: string, endDate?: string): Promise<PatientBreakdownItem[]> {
    const query = buildDateParams(startDate, endDate);
    const response = await API.get<ApiResponse<PatientBreakdownItem[]>>(`/v2/professionals/${doctorId}/patients-breakdown${query ? `?${query}` : ''}`);
    return response.data.data;
  },

  async getSettlements(doctorId: string): Promise<SettlementItem[]> {
    const response = await API.get<ApiResponse<SettlementItem[]>>(`/v2/professionals/${doctorId}/settlements`);
    return response.data.data;
  },

  async getFinancialIssues(startDate?: string, endDate?: string, limit = 50): Promise<FinancialIssue[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('limit', limit.toString());
    const response = await API.get<ApiResponse<FinancialIssue[]>>(`/internal/financial/reconciliation/issues?${params.toString()}`);
    return response.data.data;
  }
};
