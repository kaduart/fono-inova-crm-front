/**
 * 📋 Interesse em convênios (GEAP / IPASGO / Bradesco...)
 * Cadastros vindos do site enquanto o credenciamento está em andamento (lista de interesse).
 * Backend: back/routes/convenioWaitlist.js (API /convenio-waitlist, coleção convenio_waitlist —
 * nome técnico; não confundir com a fila de horários da Amanda).
 */

import api from './api';

export type WaitlistConvenio = 'geap' | 'ipasgo' | 'bradesco';
export type WaitlistStatus = 'aguardando' | 'contatado' | 'agendado' | 'descartado';

export interface WaitlistSubmission {
  especialidade: string | null;
  idadeCrianca: number | null;
  periodo: string | null;
  at: string;
}

export interface WaitlistEntry {
  _id: string;
  name: string;
  phone: string; // E.164 BR, ex.: 5562992013573
  email: string | null;
  convenio: WaitlistConvenio;
  convenioLabel: string;
  especialidade: string | null;
  idadeCrianca: number | null;
  periodo: string | null;
  status: WaitlistStatus;
  notifiedAt: string | null;
  notes: string;
  requestCount: number;
  submissions: WaitlistSubmission[];
  consent?: { accepted: boolean; acceptedAt: string | null; version: string | null };
  source?: { pagePath?: string | null; utmSource?: string | null; utmCampaign?: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistListParams {
  convenio?: WaitlistConvenio | '';
  status?: WaitlistStatus | '';
  especialidade?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  order?: 'asc' | 'desc';
}

export interface WaitlistListResponse {
  data: WaitlistEntry[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type WaitlistConvenioSummary = { label: string; total: number } & Record<WaitlistStatus, number>;

export interface WaitlistSummary {
  total: number;
  porConvenio: Record<WaitlistConvenio, WaitlistConvenioSummary>;
}

const cleanParams = (params: WaitlistListParams) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''));

export const convenioWaitlistApi = {
  list: async (params: WaitlistListParams = {}): Promise<WaitlistListResponse> => {
    const { data } = await api.get<WaitlistListResponse>('/convenio-waitlist', { params: cleanParams(params) });
    return data;
  },

  summary: async (): Promise<WaitlistSummary> => {
    const { data } = await api.get<WaitlistSummary>('/convenio-waitlist/summary');
    return data;
  },

  update: async (id: string, body: { status?: WaitlistStatus; notes?: string }): Promise<WaitlistEntry> => {
    const { data } = await api.patch<WaitlistEntry>(`/convenio-waitlist/${id}`, body);
    return data;
  },
};

export default convenioWaitlistApi;
