// src/services/professionalCommissionService.ts
import API from './api';
import { ICommissionRule } from '../utils/types/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface CommissionSimulation {
  doctorId: string;
  doctorName: string;
  version: number;
  period: { start: string; end: string };
  sessions: number;
  production: number;
  commission: number;
  rulesApplied: Array<ICommissionRule & { note?: string }>;
}

export const professionalCommissionService = {
  async getRules(doctorId: string): Promise<ICommissionRule[]> {
    const response = await API.get<ApiResponse<ICommissionRule[]>>(`/v2/professionals/${doctorId}/commission-rules`);
    return response.data.data;
  },

  async createRule(doctorId: string, rule: Omit<ICommissionRule, '_id'>): Promise<ICommissionRule> {
    const response = await API.post<ApiResponse<ICommissionRule>>(`/v2/professionals/${doctorId}/commission-rules`, rule);
    return response.data.data;
  },

  async updateRule(doctorId: string, ruleId: string, rule: Partial<ICommissionRule>): Promise<ICommissionRule> {
    const response = await API.patch<ApiResponse<ICommissionRule>>(`/v2/professionals/${doctorId}/commission-rules/${ruleId}`, rule);
    return response.data.data;
  },

  async deleteRule(doctorId: string, ruleId: string): Promise<{ deleted: boolean }> {
    const response = await API.delete<ApiResponse<{ deleted: boolean }>>(`/v2/professionals/${doctorId}/commission-rules/${ruleId}`);
    return response.data.data;
  },

  async simulate(doctorId: string, startDate: string, endDate: string): Promise<CommissionSimulation> {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await API.get<ApiResponse<CommissionSimulation>>(`/v2/professionals/${doctorId}/commission-simulation?${params.toString()}`);
    return response.data.data;
  }
};
