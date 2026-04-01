// src/services/patientService.v2.ts
/**
 * Patient Service V2 - CQRS + Event-Driven
 * 
 * Features:
 * - Async write (202 Accepted)
 * - Optimistic UI
 * - Polling automático
 * - Fallback para V1
 */

import API from "./api";
import { IPatient } from "../utils/types/types";
import { normalizeIPatient } from "../utils/normalize";

// ============================================
// CONFIG
// ============================================

const USE_V2_PATIENT = import.meta.env.VITE_USE_V2_PATIENT === 'true' || true;

const POLL_CONFIG = {
  maxAttempts: 30,
  interval: 800, // ms
  backoffMultiplier: 1.2
};

// ============================================
// TYPES
// ============================================

export interface CreatePatientResponse {
  success: boolean;
  data: {
    eventId: string;
    correlationId: string;
    jobId: string;
    patientId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    checkStatusUrl: string;
    estimatedTime: string;
  };
  message?: string;
}

export interface PatientStatusResponse {
  success: boolean;
  data: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    patientView?: IPatient;
    error?: string;
    processedAt?: string;
  };
}

export interface ListPatientsResponse {
  success: boolean;
  data: {
    patients: IPatient[];
    pagination: {
      total: number;
      limit: number;
      skip: number;
      hasMore: boolean;
    };
    meta?: {
      duration: string;
      source: string;
      staleCount?: number;
    };
  };
}

// ============================================
// POLLING
// ============================================

async function pollEventStatus(
  eventId: string,
  options: {
    onProgress?: (status: string, attempt: number) => void;
    onSuccess?: (data: any) => void;
    onError?: (error: string) => void;
  } = {}
): Promise<PatientStatusResponse['data']> {
  const { onProgress, onSuccess, onError } = options;
  
  let interval = POLL_CONFIG.interval;
  
  for (let attempt = 1; attempt <= POLL_CONFIG.maxAttempts; attempt++) {
    try {
      const response = await API.get<PatientStatusResponse>(`/v2/patients/status/${eventId}`);
      const { status, patientView, error } = response.data.data;
      
      onProgress?.(status, attempt);
      
      if (status === 'completed') {
        onSuccess?.(patientView);
        return response.data.data;
      }
      
      if (status === 'failed') {
        onError?.(error || 'Processamento falhou');
        throw new Error(error || 'Processamento falhou');
      }
      
      // Aguarda com backoff
      await new Promise(resolve => setTimeout(resolve, interval));
      interval = Math.min(interval * POLL_CONFIG.backoffMultiplier, 5000);
      
    } catch (error: any) {
      // Se for erro de rede, continua tentando
      if (!error.response) {
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Timeout aguardando processamento do paciente');
}

// ============================================
// SERVICE
// ============================================

export const patientServiceV2 = {
  USE_V2: USE_V2_PATIENT,

  // ==========================================
  // READ (síncrono, rápido)
  // ==========================================

  /**
   * Lista pacientes - usa PatientsView (10-50ms)
   */
  async list(options: {
    search?: string;
    limit?: number;
    skip?: number;
    doctorId?: string;
    status?: string;
  } = {}): Promise<ListPatientsResponse['data']> {
    const { search, limit = 50, skip = 0, doctorId, status } = options;
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', limit.toString());
    params.append('skip', skip.toString());
    if (doctorId) params.append('doctorId', doctorId);
    if (status) params.append('status', status);
    
    const response = await API.get<ListPatientsResponse>(`/v2/patients?${params}`);
    return response.data.data;
  },

  /**
   * Busca paciente por ID
   */
  async getById(id: string): Promise<IPatient> {
    const response = await API.get(`/v2/patients/${id}`);
    return response.data.data;
  },

  /**
   * Busca completa (com dados crus do domínio se necessário)
   */
  async getFull(id: string): Promise<{
    view: IPatient;
    patient: IPatient;
    recentAppointments: any[];
  }> {
    const response = await API.get(`/v2/patients/${id}/full`);
    return response.data.data;
  },

  // ==========================================
  // WRITE (async com polling)
  // ==========================================

  /**
   * Cria paciente - async com polling
   * 
   * Retorna imediatamente com patientId provisório
   * Faz polling automático até completar
   */
  async create(
    data: IPatient,
    options: {
      onProgress?: (status: string, attempt: number) => void;
      onSuccess?: (patient: IPatient) => void;
      onError?: (error: string) => void;
      skipPolling?: boolean; // se true, retorna imediatamente sem esperar
    } = {}
  ): Promise<{
    patient: IPatient;
    isAsync: boolean;
    eventId?: string;
  }> {
    const { onProgress, onSuccess, onError, skipPolling } = options;
    
    // Normaliza dados
    const normalizedData = normalizeIPatient(data);
    
    // Envia request
    const response = await API.post<CreatePatientResponse>('/v2/patients', normalizedData);
    const { eventId, patientId, status, checkStatusUrl } = response.data.data;
    
    // Se já completou (raro, mas possível em cache hit)
    if (status === 'completed') {
      const patient = await this.getById(patientId);
      onSuccess?.(patient);
      return { patient, isAsync: false };
    }
    
    // Se skipPolling, retorna imediatamente (UI otimista)
    if (skipPolling) {
      const optimisticPatient = {
        ...normalizedData,
        _id: patientId,
        id: patientId,
        status: 'creating',
        createdAt: new Date().toISOString()
      } as IPatient;
      
      return { 
        patient: optimisticPatient, 
        isAsync: true,
        eventId 
      };
    }
    
    // Polling até completar
    const finalStatus = await pollEventStatus(eventId, {
      onProgress,
      onSuccess: (view) => onSuccess?.(view as IPatient),
      onError
    });
    
    const patient = finalStatus.patientView || await this.getById(patientId);
    
    return { 
      patient, 
      isAsync: true,
      eventId 
    };
  },

  /**
   * Atualiza paciente - async
   */
  async update(
    id: string,
    data: Partial<IPatient>,
    options: {
      onProgress?: (status: string, attempt: number) => void;
      skipPolling?: boolean;
    } = {}
  ): Promise<{
    patient: IPatient;
    isAsync: boolean;
    eventId?: string;
  }> {
    const response = await API.put(`/v2/patients/${id}`, data);
    const { eventId, status } = response.data.data;
    
    if (status === 'completed') {
      const patient = await this.getById(id);
      return { patient, isAsync: false };
    }
    
    if (options.skipPolling) {
      return {
        patient: { _id: id, ...data } as IPatient,
        isAsync: true,
        eventId
      };
    }
    
    await pollEventStatus(eventId, {
      onProgress: options.onProgress
    });
    
    const patient = await this.getById(id);
    return { patient, isAsync: true, eventId };
  },

  /**
   * Deleta paciente - async
   */
  async delete(
    id: string,
    options: {
      reason?: string;
      onProgress?: (status: string, attempt: number) => void;
      skipPolling?: boolean;
    } = {}
  ): Promise<{ isAsync: boolean; eventId?: string }> {
    const response = await API.delete(`/v2/patients/${id}`, {
      data: { reason: options.reason }
    });
    
    const { eventId, status } = response.data.data;
    
    if (status === 'completed') {
      return { isAsync: false };
    }
    
    if (options.skipPolling) {
      return { isAsync: true, eventId };
    }
    
    await pollEventStatus(eventId, {
      onProgress: options.onProgress
    });
    
    return { isAsync: true, eventId };
  },

  // ==========================================
  // STATUS
  // ==========================================

  /**
   * Consulta status de evento
   */
  async getEventStatus(eventId: string): Promise<PatientStatusResponse['data']> {
    const response = await API.get<PatientStatusResponse>(`/v2/patients/status/${eventId}`);
    return response.data.data;
  },

  // ==========================================
  // DEBUG (admin only)
  // ==========================================

  async debugCheck(id: string): Promise<any> {
    const response = await API.get(`/v2/patients/debug/${id}`);
    return response.data.data;
  },

  async debugFix(id: string): Promise<any> {
    const response = await API.post(`/v2/patients/debug/${id}/fix`);
    return response.data.data;
  }
};

// ============================================
// FALLBACK V1 (para migração gradual)
// ============================================

import { patientService as patientServiceV1 } from './patientService';

export const patientServiceHybrid = {
  USE_V2: USE_V2_PATIENT,

  async list(options?: Parameters<typeof patientServiceV2.list>[0]): Promise<IPatient[]> {
    if (USE_V2_PATIENT) {
      const result = await patientServiceV2.list(options);
      return result.patients;
    }
    return patientServiceV1.fetchAll();
  },

  async search(searchTerm: string): Promise<IPatient[]> {
    if (USE_V2_PATIENT) {
      const result = await patientServiceV2.list({ search: searchTerm, limit: 100 });
      return result.patients;
    }
    return patientServiceV1.search(searchTerm);
  },

  async create(data: IPatient, options?: Parameters<typeof patientServiceV2.create>[1]) {
    if (USE_V2_PATIENT) {
      const result = await patientServiceV2.create(data, options);
      return result.patient;
    }
    return patientServiceV1.create(data);
  },

  async update(id: string, data: Partial<IPatient>) {
    if (USE_V2_PATIENT) {
      const result = await patientServiceV2.update(id, data);
      return result.patient;
    }
    return patientServiceV1.update(id, data);
  },

  async delete(id: string) {
    if (USE_V2_PATIENT) {
      await patientServiceV2.delete(id);
      return;
    }
    return patientServiceV1.delete(id);
  },

  async getById(id: string) {
    if (USE_V2_PATIENT) {
      return patientServiceV2.getById(id);
    }
    return patientServiceV1.fetchById(id);
  }
};

export default patientServiceHybrid;
