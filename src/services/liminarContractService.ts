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
  doctor?: string;
  slots: TherapySlot[];
  sessionValue: number;
  sessionDurationMinutes: number;
  notes?: string | null;
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

export interface SpecialtyIntegrity {
  slotsPerWeek: number;
  sessionValue: number;
  expected: number;
  generated: number;
  completed: number;
  pending: number;
  missing: number;
  canceled: number;
  totalSessions: number | null;
}

export interface ContractIntegrity {
  contractId: string;
  planVersion: number;
  window: { from: string; to: string } | null;
  specialties: Record<string, SpecialtyIntegrity>;
  summary: { expected: number; generated: number; completed: number; pending: number; missing: number; integrityPercent: number };
}

export interface ExhaustionProjection {
  methodology: 'scheduled_plan' | 'historical_last_weeks';
  treatmentStartDate: string | null;
  averageSessionsPerWeek: number;
  averageSessionValue: number;
  weeklyConsumption: number;
  remainingSessions: number;
  remainingWeeks: number;
  estimatedExhaustionDate: string;
  confidence: 'high' | 'medium' | 'low';
  sampleWeeks: number;
}

export interface CommittedBalance {
  creditBalance: number;
  usedCredit: number;
  committed: number;
  available: number;
  projection: ExhaustionProjection | null;
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

  async inactivate(contractId: string): Promise<{
    contractId: string;
    sessionsCanceled: number;
    appointmentsCanceled: number;
    paymentsCanceled: number;
  }> {
    const res = await API.post(`/v2/liminar-contracts/${contractId}/inactivate`);
    return res.data;
  },

  async getActivePlan(contractId: string): Promise<TherapeuticPlan | null> {
    try {
      const res = await API.get(`/v2/liminar-contracts/${contractId}/plans/active`);
      return res.data.plan ?? null;
    } catch {
      return null;
    }
  },

  async getActivePlanWithError(contractId: string): Promise<{ plan: TherapeuticPlan | null; error: string | null }> {
    try {
      const res = await API.get(`/v2/liminar-contracts/${contractId}/plans/active`);
      return { plan: res.data.plan ?? null, error: null };
    } catch (err: any) {
      return { plan: null, error: err?.response?.data?.error ?? 'Nenhum plano ativo' };
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
    data: { mode: 'append' | 'reset'; weeks?: number; startDate?: string; endDate?: string; skipHolidays?: boolean; specialties?: string[] }
  ): Promise<GenerateSessionsResult> {
    const res = await API.post(
      `/v2/liminar-contracts/${contractId}/plans/${planId}/generate-sessions`,
      data
    );
    return res.data;
  },

  async getCommittedBalance(contractId: string): Promise<CommittedBalance> {
    const res = await API.get(`/v2/liminar-contracts/${contractId}/committed-balance`);
    return res.data;
  },

  async updateTherapy(
    contractId: string,
    planId: string,
    specialty: string,
    data: {
      doctorId?: string;
      sessionValue?: number;
      sessionDurationMinutes?: number;
      slots?: Array<{ dayOfWeek: number; time: string }>;
      notes?: string | null;
    }
  ): Promise<{ plan: TherapeuticPlan; appointmentsUpdated: number; appointmentsCanceled: number }> {
    const res = await API.patch(
      `/v2/liminar-contracts/${contractId}/plans/${planId}/therapies/${specialty}`,
      data
    );
    return res.data;
  },

  async getIntegrity(contractId: string): Promise<ContractIntegrity> {
    const res = await API.get(`/v2/liminar-contracts/${contractId}/integrity`);
    return res.data;
  },

  async getSessions(contractId: string, params?: { specialty?: string; status?: string; from?: string; to?: string }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.specialty) query.append('specialty', params.specialty);
    if (params?.status)    query.append('status', params.status);
    if (params?.from)      query.append('from', params.from);
    if (params?.to)        query.append('to', params.to);
    const res = await API.get(`/v2/liminar-contracts/${contractId}/sessions?${query.toString()}`);
    return res.data?.sessions ?? [];
  },

  async moveAppointmentSpecialty(
    contractId: string,
    appointmentId: string,
    targetSpecialty: string,
    reason?: string
  ): Promise<{
    appointmentId: string;
    fromSpecialty: string;
    toSpecialty: string;
    sessionValue: { old: number; new: number };
    doctorId: string;
  }> {
    const res = await API.patch(
      `/v2/liminar-contracts/${contractId}/appointments/${appointmentId}/specialty`,
      { targetSpecialty, reason }
    );
    return res.data.data;
  },
};

export default liminarContractService;
