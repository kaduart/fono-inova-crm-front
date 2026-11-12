/**
 * 🧠 Candidatos a neuro — paciente da casa (fono/psico/TO) com sinais de TEA/TDAH que ainda não passou
 * pela consulta com neuropediatra (quem emite o laudo). Neuro é SÓ PARTICULAR.
 * Backend: back/routes/neuroReferrals.js (API /neuro-referrals, coleção neuro_referrals).
 */
import api from './api';

export type NeuroReferralStatus =
  | 'a_confirmar' | 'indicado' | 'oferecido' | 'agendado' | 'recusado' | 'ja_tem_laudo' | 'descartado';
export type NeuroReferralReason = 'tea' | 'tdah' | 'atraso_desenvolvimento' | 'outro';

export interface NeuroReferralPatient {
  _id: string;
  fullName: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  legalGuardian?: string | null;
  status?: string;
}

export interface NeuroReferral {
  _id: string;
  patient: NeuroReferralPatient | string;
  status: NeuroReferralStatus;
  reasons: NeuroReferralReason[];
  source: 'terapeuta' | 'sugestao_automatica';
  matchedTerms: string[];
  matchedIn: string[];
  homeSpecialties: string[];
  note: string | null;
  offeredAt: string | null;
  scheduledAt: string | null;
  appointment: string | null;
  declineReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NeuroReferralSummary {
  byStatus: Record<NeuroReferralStatus, number>;
  pendingOffer: number;
  pendingTherapist: number;
  conversionRate: number | null;
}

export interface NeuroScanResult {
  scanned: number;
  candidates: number;
  created: number;
  dryRun: boolean;
}

type Envelope<T> = { success: boolean; data: T; created?: boolean };

const neuroReferralApi = {
  /** status: lista separada por vírgula, ou 'all'. Sem status = só os ativos. */
  async list(status?: string, patientId?: string): Promise<NeuroReferral[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (patientId) params.patientId = patientId;
    const { data } = await api.get<Envelope<NeuroReferral[]>>('/neuro-referrals', { params });
    return data.data;
  },
  async summary(): Promise<NeuroReferralSummary> {
    const { data } = await api.get<Envelope<NeuroReferralSummary>>('/neuro-referrals/summary');
    return data.data;
  },
  async scan(dryRun = false): Promise<NeuroScanResult> {
    const { data } = await api.post<Envelope<NeuroScanResult>>('/neuro-referrals/scan', {}, { params: dryRun ? { dryRun: 1 } : {} });
    return data.data;
  },
  async refer(patientId: string, reasons: NeuroReferralReason[], note?: string): Promise<NeuroReferral> {
    const { data } = await api.post<Envelope<NeuroReferral>>('/neuro-referrals', { patientId, reasons, note });
    return data.data;
  },
  async update(id: string, body: { status?: NeuroReferralStatus; note?: string; declineReason?: string; reasons?: NeuroReferralReason[] }): Promise<NeuroReferral> {
    const { data } = await api.patch<Envelope<NeuroReferral>>(`/neuro-referrals/${id}`, body);
    return data.data;
  },
};

export default neuroReferralApi;
