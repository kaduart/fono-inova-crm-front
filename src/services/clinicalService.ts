// Relatório mensal (item 3) e PEI (item 5). Contratos: back/docs/FAMILY_COMMUNICATION.md e back/docs/PEI.md.
import API from './api';

// ─── Relatório mensal ─────────────────────────────────────────────

export interface MonthlyArea { name: string; first: number; last: number; delta: number; sessions: number }
export interface MonthlyGoal { goalId: string; area: string; description: string; criterion?: string | null; baseline: number; target: number; current: number; status: PeiGoalStatus; progressPct: number }
export interface MonthlyReport {
    _id: string;
    patient: string;
    doctor: string | { _id: string; fullName: string; specialty?: string };
    month: string;
    status: 'draft' | 'approved' | 'sent';
    data: {
        sessionsWithEvolution: number;
        attendance: { attended: number; missed: number; canceled: number; rate: number | null };
        areas: MonthlyArea[];
        goals: MonthlyGoal[];
        treatmentStatus?: string | null;
    };
    summary: string;
    nextSteps: string;
    familyMessage: string;
    generatedAt?: string;
    approvedAt?: string;
    sentAt?: string;
    phoneLast4?: string;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const monthLabel = (month: string) => {
    const m = /^(\d{4})-(\d{2})$/.exec(month);
    return m ? `${MONTHS[Number(m[2]) - 1]} de ${m[1]}` : month;
};

export const monthlyReports = {
    async list(patientId: string): Promise<MonthlyReport[]> {
        return (await API.get(`/v2/monthly-reports/patient/${patientId}`)).data.data;
    },
    async generate(patientId: string, month: string): Promise<MonthlyReport> {
        return (await API.post('/v2/monthly-reports/generate', { patientId, month })).data.data;
    },
    async update(id: string, body: Partial<Pick<MonthlyReport, 'summary' | 'nextSteps' | 'familyMessage'>>): Promise<MonthlyReport> {
        return (await API.put(`/v2/monthly-reports/${id}`, body)).data.data;
    },
    async approve(id: string): Promise<MonthlyReport> {
        return (await API.post(`/v2/monthly-reports/${id}/approve`)).data.data;
    },
    async send(id: string, text: string): Promise<MonthlyReport> {
        return (await API.post(`/v2/monthly-reports/${id}/send`, { text })).data.data;
    },
    async pdf(id: string): Promise<Blob> {
        const res = await API.get(`/v2/monthly-reports/${id}/pdf`, { responseType: 'blob' });
        return new Blob([res.data], { type: 'application/pdf' });
    },
};

// ─── PEI ──────────────────────────────────────────────────────────

export type PeiGoalStatus = 'active' | 'achieved' | 'paused';
export interface PeiProgress { date: string; value: number; note?: string }
export interface PeiGoal {
    _id?: string;
    area: string;
    description: string;
    criterion?: string;
    baseline: number;
    target: number;
    current?: number;
    status?: PeiGoalStatus;
    achievedAt?: string;
    history?: PeiProgress[];
    progressPct?: number;
}
export interface PeiPlan {
    _id: string;
    patient: string;
    doctor: string | { _id: string; fullName: string; specialty?: string };
    specialty?: string;
    status: 'active' | 'closed';
    startDate: string;
    reviewDate?: string;
    notes?: string;
    goals: PeiGoal[];
    closedAt?: string;
}
export type PeiGoalInput = Pick<PeiGoal, '_id' | 'area' | 'description' | 'criterion' | 'baseline' | 'target' | 'status'>;

export const pei = {
    async list(patientId: string): Promise<PeiPlan[]> {
        return (await API.get(`/v2/pei/patient/${patientId}`)).data.data;
    },
    async create(body: { patientId: string; specialty?: string; reviewDate?: string; notes?: string; goals: PeiGoalInput[] }): Promise<PeiPlan> {
        return (await API.post('/v2/pei', body)).data.data;
    },
    async update(id: string, body: { reviewDate?: string | null; notes?: string; goals?: PeiGoalInput[] }): Promise<PeiPlan> {
        return (await API.put(`/v2/pei/${id}`, body)).data.data;
    },
    async progress(id: string, goalId: string, value: number, note?: string): Promise<PeiPlan> {
        return (await API.post(`/v2/pei/${id}/goals/${goalId}/progress`, { value, note })).data.data;
    },
    async close(id: string): Promise<PeiPlan> {
        return (await API.post(`/v2/pei/${id}/close`)).data.data;
    },
};
