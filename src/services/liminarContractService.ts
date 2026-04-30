import API from './api';

export interface LiminarContract {
  _id: string;
  patient: string;
  doctor: string;
  totalCredit: number;
  creditBalance: number;
  usedCredit: number;
  status: 'active' | 'exhausted' | 'canceled';
  processNumber?: string;
  court?: string;
  expirationDate?: string;
  createdAt: string;
}

export interface TherapySlot {
  dayOfWeek: number; // 0=dom … 6=sab
  time: string;      // "HH:MM"
}

export interface TherapyConfig {
  slots: TherapySlot[];
  sessionValue: number;
  sessionDurationMinutes: number;
}

export interface TherapeuticPlan {
  _id: string;
  version: number;
  status: 'active' | 'superseded' | 'canceled';
  therapies: Record<string, TherapyConfig>;
  startDate: string;
  notes?: string;
}

export interface GenerateSessionsResult {
  created: number;
  skipped: number;
  total: number;
  totalCost: number;
  saldo: number;
  saldoAposTudo: number;
}

const liminarContractService = {
  async list(patientId: string): Promise<LiminarContract[]> {
    const res = await API.get(`/v2/liminar-contracts?patientId=${patientId}`);
    return res.data?.contracts ?? [];
  },

  async create(data: {
    patientId: string;
    doctorId: string;
    totalCredit: number;
    processNumber?: string;
    court?: string;
    expirationDate?: string;
  }): Promise<LiminarContract> {
    const res = await API.post('/v2/liminar-contracts', data);
    return res.data.contract;
  },

  async recharge(contractId: string, amount: number, reason?: string): Promise<LiminarContract> {
    const res = await API.patch(`/v2/liminar-contracts/${contractId}/recharge`, {
      amount,
      reason: reason || 'judicial_recharge',
    });
    return res.data.contract;
  },

  async getActivePlan(contractId: string): Promise<TherapeuticPlan | null> {
    try {
      const res = await API.get(`/v2/liminar-contracts/${contractId}/plans/active`);
      return res.data.plan ?? null;
    } catch {
      return null;
    }
  },

  async createPlan(
    contractId: string,
    data: {
      therapies: Record<string, Omit<TherapyConfig, 'sessionDurationMinutes'> & { sessionDurationMinutes?: number }>;
      notes?: string;
      startDate?: string;
    }
  ): Promise<TherapeuticPlan> {
    const res = await API.post(`/v2/liminar-contracts/${contractId}/plans`, data);
    return res.data.plan;
  },

  async generateSessions(
    contractId: string,
    planId: string,
    data: { startDate: string; endDate: string; skipHolidays?: boolean }
  ): Promise<GenerateSessionsResult> {
    const res = await API.post(
      `/v2/liminar-contracts/${contractId}/plans/${planId}/generate-sessions`,
      data
    );
    return res.data;
  },
};

export default liminarContractService;
