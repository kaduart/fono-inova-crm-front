/**
 * 📋 Interesse em convênios (GEAP / Unimed / IPASGO / Bradesco...)
 * Cadastros vindos do site enquanto o credenciamento está em andamento (lista de interesse).
 * Backend: back/routes/convenioWaitlist.js (API /convenio-waitlist, coleção convenio_waitlist —
 * nome técnico; não confundir com a fila de horários da Amanda).
 */

import api from './api';

export type WaitlistConvenio = 'geap' | 'unimed' | 'ipasgo' | 'bradesco';
export type WaitlistStatus = 'aguardando' | 'contatado' | 'agendado' | 'descartado';

export interface WaitlistSubmission {
  especialidade: string | null;
  idadeCrianca: number | null;
  periodo: string | null;
  at: string;
}

export type WaitlistChannel = 'site' | 'whatsapp_web';

/** Dados da conversa quando o interessado veio do WhatsApp Web (varredura ou captura automática). */
export interface WaitlistWhatsappInfo {
  firstMentionAt: string | null;
  lastMentionAt: string | null;
  snippet: string | null;
  snippetFromContact: boolean;
  mentionedBy?: Array<'contato' | 'clinica'>;
  capturedBy: 'scan' | 'live' | null;
  /** Última mensagem que a clínica mandou para esse número (manual, lembrete ou envio em massa) */
  lastClinicMessageAt?: string | null;
  lastContactMessageAt?: string | null;
}

/** Envio pela tela (campos offer = Retomar contato, announce = Agora atendemos) */
export interface WaitlistSendInfo {
  queuedAt: string | null;
  scheduledFor?: string | null;
  sentAt: string | null;
  error: string | null;
  /** Não enviado de propósito (ex.: a clínica conversou com a pessoa há pouco) */
  skippedAt?: string | null;
  skipReason?: string | null;
}

/** Cruzamento feito no back (só leitura): o telefone já é paciente? tem sessão futura? */
export interface WaitlistPatientMatch {
  patientId: string;
  patientName: string;
  nextAppointmentAt: string | null;
}

export type WhatsappScanStatus = 'queued' | 'running' | 'done' | 'failed';

export interface WhatsappScanRun {
  _id: string;
  /** convenio_interest = busca rápida de 1 convênio; convenio_interest_deep = histórico inteiro, os 4 de uma vez */
  kind?: 'convenio_interest' | 'convenio_interest_deep';
  convenio: WaitlistConvenio;
  status: WhatsappScanStatus;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  stats: {
    method?: string;
    messages?: number;
    contacts?: number;
    created?: number;
    updated?: number;
    closed?: number;
    unresolved?: number;
    /** só na profunda */
    total?: number;
    done?: number;
    oldest?: string | null;
    byConvenio?: Partial<Record<WaitlistConvenio, number>>;
  } | null;
}

export type BulkSendKind = 'particular' | 'credenciado';

export interface BulkSendPerson {
  id: string;
  name: string;
  phoneTail: string;
  convenio: WaitlistConvenio;
  since: string | null;
  lastClinicMessageAt: string | null;
  /** recipients: sai no lote de hoje */
  today?: boolean;
  /** recipients: desmarcado na tela */
  excluded?: boolean;
  /** recipients: quando a mensagem sai (agendado em dias úteis, até 40 por dia) */
  scheduledFor?: string | null;
  /** skipped: motivo */
  reason?: 'sessao_futura' | 'conversa_recente';
}

export interface BulkSendPreview {
  kind: BulkSendKind;
  eligible: number;
  willSend: number;
  unchecked?: number;
  skippedWithSession: number;
  skippedRecentChat?: number;
  alreadySent?: number;
  markedContatado?: number;
  recentDays?: number;
  sentToday: number;
  capacity?: number;
  /** quantas saem hoje (o resto vai sozinho nos próximos dias úteis) */
  todayCount?: number;
  /** em quantos dias úteis o envio termina */
  days?: number;
  finishesAt?: string | null;
  limitReason: 'limite_diario' | 'fim_do_horario' | 'fim_de_semana' | 'antes_do_horario';
  sample: string | null;
  recipients?: BulkSendPerson[];
  skipped?: BulkSendPerson[];
  /** Conferência das conversas no WhatsApp (quem a clínica já falou há pouco) */
  activity?: { status: WhatsappScanStatus; finishedAt: string | null } | null;
}

export interface BulkSendBody {
  kind: BulkSendKind;
  convenio?: WaitlistConvenio | '';
  especialidades?: string;
  /** Nome de quem assina a mensagem de "Retomar contato" ("Aqui é a [Atendente]") */
  atendente?: string;
  /** Pessoas desmarcadas na lista (id do cadastro) */
  excludeIds?: string[];
  confirm?: boolean;
}

/** Varredura profunda: convenio vem como 'todos'. */
export type WhatsappDeepScanRun = Omit<WhatsappScanRun, 'convenio'> & { convenio: 'todos' };

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
  /** Ausente em cadastro antigo = site. */
  channel?: WaitlistChannel;
  whatsapp?: WaitlistWhatsappInfo;
  patientMatch?: WaitlistPatientMatch | null;
  offer?: WaitlistSendInfo | null;
  announce?: WaitlistSendInfo | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistListParams {
  convenio?: WaitlistConvenio | '';
  status?: WaitlistStatus | '';
  channel?: WaitlistChannel | '';
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

export interface WaitlistInsight { active: number; aged30: number; scheduledMonth: number; avgDays: number }

export interface WaitlistSummary {
  total: number;
  porConvenio: Record<WaitlistConvenio, WaitlistConvenioSummary>;
  /** Calculado no back (docs/SALES_MARKETING.md). Pode faltar em back antigo. */
  insights?: WaitlistInsight & { potentialMonthly: number; porConvenio: Partial<Record<WaitlistConvenio, WaitlistInsight>> };
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

  /** Busca (só leitura) no WhatsApp Web quem falou do convênio; roda no servidor do WhatsApp. */
  startWhatsappScan: async (convenio: WaitlistConvenio): Promise<{ run: WhatsappScanRun; alreadyRunning: boolean }> => {
    const { data } = await api.post<{ run: WhatsappScanRun; alreadyRunning: boolean }>('/convenio-waitlist/whatsapp-scan', { convenio });
    return data;
  },

  latestWhatsappScan: async (convenio: WaitlistConvenio): Promise<WhatsappScanRun | null> => {
    const { data } = await api.get<{ run: WhatsappScanRun | null }>('/convenio-waitlist/whatsapp-scan/latest', { params: { convenio } });
    return data.run;
  },

  /** Varredura profunda: conversa por conversa, puxando o histórico antigo do celular (horas; retoma sozinha). */
  startDeepWhatsappScan: async (): Promise<{ run: WhatsappDeepScanRun; alreadyRunning: boolean }> => {
    const { data } = await api.post<{ run: WhatsappDeepScanRun; alreadyRunning: boolean }>('/convenio-waitlist/whatsapp-scan', { deep: true });
    return data;
  },

  /** Envio em massa pelo WhatsApp. confirm=false (padrão) só devolve a prévia, não envia nada. */
  bulkSend: async (body: BulkSendBody): Promise<{ preview: BulkSendPreview; queued: number; failed?: number; finishesAt?: string | null }> => {
    const { data } = await api.post<{ preview: BulkSendPreview; queued: number; failed?: number; finishesAt?: string | null }>('/convenio-waitlist/bulk-offer', {
      ...body,
      convenio: body.convenio || undefined,
    });
    return data;
  },

  /** Envio individual pelo WhatsApp da clínica (fila do back, não abre o wa.me). confirm=false só devolve o texto pronto. */
  sendWhatsapp: async (
    id: string,
    body: { kind: BulkSendKind; message?: string; especialidades?: string; atendente?: string; confirm?: boolean },
  ): Promise<{ message?: string; sent: boolean; jobId?: string }> => {
    const { data } = await api.post<{ message?: string; sent: boolean; jobId?: string }>(`/convenio-waitlist/${id}/whatsapp`, body);
    return data;
  },

  latestDeepWhatsappScan: async (): Promise<WhatsappDeepScanRun | null> => {
    const { data } = await api.get<{ run: WhatsappDeepScanRun | null }>('/convenio-waitlist/whatsapp-scan/latest', { params: { deep: true } });
    return data.run;
  },
};

export default convenioWaitlistApi;
