// src/services/insuranceGuideApi.ts
import API from './api';
import { extractErrorMessage, extractErrorCode } from '../utils/errorUtils';
import type { GuidePolicy, MigrationStrategy } from './insuranceService';

export interface LifecycleAlert {
  code: string;
  severity: 'error' | 'warning' | 'info';
  metadata?: Record<string, unknown>;
}

export interface GuideLifecycleResult {
  state: {
    status: string;
  };
  eligibility: {
    canSchedule: boolean;
    canBill: boolean;
    canRenew: boolean;
    canEdit: boolean;
    canBeSuperseded: boolean;
  };
  alerts: LifecycleAlert[];
}

export interface GuideAppointment {
  _id: string;
  date: string;
  time?: string;
  status: string;
  serviceType?: string;
  sessionType?: string;
  notes?: string;
  doctor?: { _id: string; fullName: string } | null;
  professionalName?: string;
  createdAt: string;
}

export interface InsuranceGuide {
  _id: string;
  number: string;
  patientId: string;
  specialty: string;
  insurance: string;
  totalSessions: number;
  usedSessions: number;
  expiresAt: string;
  status: 'active' | 'exhausted' | 'expired' | 'cancelled' | 'superseded' | 'linked';
  sessionValue?: number | null;
  evaluationAmount?: number | null;
  generateEvaluationBilling?: boolean;
  evaluationSessionId?: string | null;
  notes?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  remaining?: number;
  // Cadeia de substituição
  supersededBy?: string | null;
  supersedes?: string | null;
  supersededAt?: string | null;
  replacementTrigger?: string | null;
  replacementMethod?: MigrationStrategy | null;
  replacementNotes?: string | null;
  // Política do convênio (join no GET)
  guidePolicy?: GuidePolicy | null;
  defaultSessions?: number | null;
  // Ciclo de vida avaliado pelo backend
  lifecycle?: GuideLifecycleResult;
}

export interface SupersedeGuideData {
  newGuide: {
    number: string;
    expiresAt: string;
    totalSessions: number;
    sessionValue?: number | null;
    evaluationAmount?: number | null;
    doctorId?: string | null;
    notes?: string | null;
    issuedAt?: string | null;
    billingMode?: string;
  };
  replacementTrigger: 'expiration' | 'new_authorization' | 'administrative_correction' | 'judicial_order' | 'manual';
  replacementNotes?: string | null;
  migrationStrategy: MigrationStrategy;
  appointmentIds?: string[];
}

export interface InsuranceGuideBalance {
  total: number;
  used: number;
  remaining: number;
  guides: Array<{
    id: string;
    number: string;
    specialty: string;
    insurance: string;
    total: number;
    used: number;
    remaining: number;
    expiresAt: string;
  }>;
}

export interface CreateGuideData {
  number: string;
  patientId: string;
  specialty: string;
  insurance: string;
  totalSessions: number;
  expiresAt: string;
  sessionValue?: number;
  evaluationAmount?: number;
  generateEvaluationBilling?: boolean;
  evaluationDate?: string;
  evaluationTime?: string;
  notes?: string;
}

export interface UpdateGuideData {
  specialty?: string;
  insurance?: string;
  totalSessions?: number;
  expiresAt?: string;
  sessionValue?: number | null;
  evaluationAmount?: number | null;
  generateEvaluationBilling?: boolean;
  evaluationDate?: string;
  evaluationTime?: string;
  notes?: string;
}

export interface GetGuidesFilters {
  specialty?: string;
  status?: string;
  insurance?: string;
}

interface GuideResponseEnvelope {
  guide: InsuranceGuide;
  lifecycle: GuideLifecycleResult;
}

function mergeGuideResponse(item: GuideResponseEnvelope | InsuranceGuide): InsuranceGuide {
  if (item && 'guide' in item && 'lifecycle' in item) {
    return { ...item.guide, lifecycle: item.lifecycle };
  }
  return item as InsuranceGuide;
}

/**
 * Busca guias de um paciente com filtros opcionais
 */
export const getGuides = async (
  patientId: string,
  filters?: GetGuidesFilters
): Promise<InsuranceGuide[]> => {
  try {
    const params = new URLSearchParams({ patientId });

    if (filters?.specialty) params.append('specialty', filters.specialty);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.insurance) params.append('insurance', filters.insurance);

    const response = await API.get(`/v2/insurance-guides?${params.toString()}`);

    const items: (GuideResponseEnvelope | InsuranceGuide)[] = response.data.data?.guides || [];
    return items.map(mergeGuideResponse);
  } catch (error: any) {
    throw new Error(extractErrorMessage(error, 'Erro ao buscar guias'));
  }
};

/**
 * Busca uma guia específica por ID
 */
export const getGuide = async (id: string): Promise<InsuranceGuide> => {
  try {
    const response = await API.get(`/v2/insurance-guides/${id}`);
    return mergeGuideResponse(response.data.data);
  } catch (error: any) {
    throw new Error(extractErrorMessage(error, 'Erro ao buscar guia'));
  }
};

/**
 * Cria nova guia de convênio
 */
export const createGuide = async (data: CreateGuideData): Promise<InsuranceGuide> => {
  try {
    const response = await API.post('/v2/insurance-guides', data);
    const item = response.data.data;
    return { ...(item.guide || item), lifecycle: item.lifecycle };
  } catch (error: any) {
    const errorCode = extractErrorCode(error);

    // Mapear erros específicos
    throw new Error(extractErrorMessage(error, 'Erro ao criar guia'));
  }
};

/**
 * Atualiza guia existente (apenas se não foi utilizada)
 */
export const updateGuide = async (
  id: string,
  data: UpdateGuideData
): Promise<InsuranceGuide> => {
  try {
    const response = await API.put(`/v2/insurance-guides/${id}`, data);
    const item = response.data.data;
    return { ...(item.guide || item), lifecycle: item.lifecycle };
  } catch (error: any) {
    const errorCode = extractErrorCode(error);

    if (errorCode === 'GUIDE_ALREADY_USED') {
      throw new Error('Não é possível editar guia já utilizada');
    }

    throw new Error(extractErrorMessage(error, 'Erro ao atualizar guia'));
  }
};

/**
 * Cancela guia (soft delete)
 */
export const cancelGuide = async (id: string): Promise<void> => {
  try {
    await API.delete(`/v2/insurance-guides/${id}`);
  } catch (error: any) {
    throw new Error(extractErrorMessage(error, 'Erro ao cancelar guia'));
  }
};

/**
 * Inativa guia de convênio (mesmo padrão de pacotes):
 * - Cancela sessions pendentes
 * - Cancela appointments vinculados
 * - Cancela payments pendentes
 * - Marca guia como cancelled
 */
export const inactivateGuide = async (id: string): Promise<{
  guideId: string;
  sessionsCanceled: number;
  appointmentsCanceled: number;
  paymentsCanceled: number;
}> => {
  try {
    const response = await API.post(`/v2/insurance-guides/${id}/inactivate`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(extractErrorMessage(error, 'Erro ao inativar guia'));
  }
};

/**
 * Busca agendamentos atrelados a uma guia
 */
export const getGuideAppointments = async (guideId: string): Promise<GuideAppointment[]> => {
  try {
    const response = await API.get(`/v2/insurance-guides/${guideId}/appointments`);
    return response.data.data?.appointments || [];
  } catch (error: any) {
    throw new Error(extractErrorMessage(error, 'Erro ao buscar agendamentos da guia'));
  }
};

/**
 * Bulk-atualiza terapeuta e/ou horário de todos os appointments pre_agendado/scheduled da guia
 */
export const updateGuideAppointmentsBulk = async (
  guideId: string,
  patch: { doctorId?: string; time?: string; dayOfWeek?: number }
): Promise<{ updated: number }> => {
  try {
    const response = await API.patch(`/v2/insurance-guides/${guideId}/appointments/doctor`, patch);
    return response.data?.data ?? { updated: 0 };
  } catch (error: any) {
    throw new Error(extractErrorMessage(error, 'Erro ao atualizar sessões pendentes'));
  }
};

/** @deprecated use updateGuideAppointmentsBulk */
export const updateGuideDoctor = (guideId: string, doctorId: string) =>
  updateGuideAppointmentsBulk(guideId, { doctorId });

/**
 * Busca o InsurancePlan vinculado a uma guia (retorna null se não existir)
 */
export const getInsurancePlanByGuide = async (guideId: string): Promise<any | null> => {
  try {
    const response = await API.get(`/v2/insurance-plans/guide/${guideId}`);
    return response.data?.data || null;
  } catch (error: any) {
    // 404 é o caso normal (guia ainda sem plano) — demais erros devem propagar
    // para o React Query poder retry/expor estado de erro
    if (error?.response?.status === 404) return null;
    throw new Error(extractErrorMessage(error, 'Erro ao buscar plano de convênio'));
  }
};

/**
 * Substitui uma guia por outra (supersede), com migração opcional de atendimentos
 */
export const supersedeGuide = async (
  oldGuideId: string,
  data: SupersedeGuideData
): Promise<{
  newGuide: InsuranceGuide;
  migrated: { appointmentsMigratedCount: number; sessionsMigratedCount: number };
  planCloned?: boolean;
  planGeneratedAppointmentsCount?: number;
  planAppointmentsCanceledCount?: number;
}> => {
  try {
    const response = await API.post(`/v2/insurance-guides/${oldGuideId}/supersede`, data);
    return response.data;
  } catch (error: any) {
    const code = extractErrorCode(error);
    if (code === 'GUIDE_ALREADY_SUPERSEDED') throw new Error('Esta guia já foi substituída por outra');
    if (code === 'GUIDE_PATIENT_MISMATCH')   throw new Error('Paciente não corresponde à guia original');
    if (code === 'GUIDE_INSURANCE_MISMATCH') throw new Error('Convênio não corresponde à guia original');
    if (code === 'GUIDE_SPECIALTY_MISMATCH') throw new Error('Especialidade não corresponde à guia original');
    if (code === 'MISSING_TRIGGER')          throw new Error('Motivo da substituição é obrigatório');
    throw new Error(extractErrorMessage(error, 'Erro ao renovar guia'));
  }
};

/**
 * Busca saldo agregado de guias do paciente
 */
export const getBalance = async (
  patientId: string,
  specialty?: string
): Promise<InsuranceGuideBalance> => {
  try {
    const url = specialty
      ? `/v2/insurance-guides/patient/${patientId}/balance?specialty=${specialty}`
      : `/v2/insurance-guides/patient/${patientId}/balance`;

    const response = await API.get(url);
    return response.data.data;
  } catch (error: any) {
    throw new Error(extractErrorMessage(error, 'Erro ao buscar saldo'));
  }
};
