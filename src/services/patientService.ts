// src/services/patientService.v2.ts
/**
 * Patient Service V2 - CQRS + Event-Driven (V2 ONLY)
 */

import API from "./api";
import { IPatient } from "../utils/types/types";
import { normalizeIPatient } from "../utils/normalize";

const POLL_CONFIG = {
  maxAttempts: 30,
  interval: 800,
  backoffMultiplier: 1.2
};

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

      await new Promise(resolve => setTimeout(resolve, interval));
      interval = Math.min(interval * POLL_CONFIG.backoffMultiplier, 5000);
    } catch (error: any) {
      if (!error.response) {
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Timeout aguardando processamento do paciente');
}

export const patientService = {
  async list(options: {
    search?: string;
    limit?: number;
    skip?: number;
    doctorId?: string;
    status?: string;
    sortBy?: string;
  } = {}): Promise<ListPatientsResponse['data']> {
    const { search, limit = 50, skip = 0, doctorId, status, sortBy } = options;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', limit.toString());
    params.append('skip', skip.toString());
    if (doctorId) params.append('doctorId', doctorId);
    if (status) params.append('status', status);
    if (sortBy) params.append('sortBy', sortBy);

    const response = await API.get<ListPatientsResponse>(`/v2/patients?${params}`);
    return response.data.data;
  },

  async getById(id: string): Promise<IPatient> {
    const response = await API.get(`/v2/patients/${id}`);
    return response.data.data;
  },

  async getFull(id: string): Promise<{
    view: IPatient;
    patient: IPatient;
    recentAppointments: any[];
  }> {
    const response = await API.get(`/v2/patients/${id}/full`);
    return response.data.data;
  },

  async create(
    data: IPatient,
    options: {
      onProgress?: (status: string, attempt: number) => void;
      onSuccess?: (patient: IPatient) => void;
      onError?: (error: string) => void;
      skipPolling?: boolean;
    } = {}
  ): Promise<{ patient: IPatient; isAsync: boolean; eventId?: string }> {
    const { onProgress, onSuccess, onError, skipPolling } = options;
    const normalizedData = normalizeIPatient(data);
    const response = await API.post<CreatePatientResponse>('/v2/patients', normalizedData);
    const { eventId, patientId, status } = response.data.data;

    if (status === 'completed') {
      const patient = await this.getById(patientId);
      onSuccess?.(patient);
      return { patient, isAsync: false };
    }

    if (skipPolling) {
      return {
        patient: { ...normalizedData, _id: patientId, id: patientId, status: 'creating', createdAt: new Date().toISOString() } as IPatient,
        isAsync: true,
        eventId
      };
    }

    const finalStatus = await pollEventStatus(eventId, {
      onProgress,
      onSuccess: (view) => onSuccess?.(view as IPatient),
      onError
    });

    const patient = finalStatus.patientView || await this.getById(patientId);
    return { patient, isAsync: true, eventId };
  },

  async update(
    id: string,
    data: Partial<IPatient>,
    options: { onProgress?: (status: string, attempt: number) => void; skipPolling?: boolean } = {}
  ): Promise<{ patient: IPatient; isAsync: boolean; eventId?: string }> {
    const response = await API.put(`/v2/patients/${id}`, data);
    const { eventId, status } = response.data.data;

    if (status === 'completed') {
      const patient = await this.getById(id);
      return { patient, isAsync: false };
    }

    if (options.skipPolling) {
      return { patient: { _id: id, ...data } as IPatient, isAsync: true, eventId };
    }

    await pollEventStatus(eventId, { onProgress: options.onProgress });
    const patient = await this.getById(id);
    return { patient, isAsync: true, eventId };
  },

  async delete(
    id: string,
    options: { reason?: string; onProgress?: (status: string, attempt: number) => void; skipPolling?: boolean } = {}
  ): Promise<{ isAsync: boolean; eventId?: string }> {
    const response = await API.delete(`/v2/patients/${id}`, { data: { reason: options.reason } });
    const { eventId, status } = response.data.data;

    if (status === 'completed') return { isAsync: false };
    if (options.skipPolling) return { isAsync: true, eventId };

    await pollEventStatus(eventId, { onProgress: options.onProgress });
    return { isAsync: true, eventId };
  },

  async getEventStatus(eventId: string): Promise<PatientStatusResponse['data']> {
    const response = await API.get<PatientStatusResponse>(`/v2/patients/status/${eventId}`);
    return response.data.data;
  },

  // Compatibilidade com código legado (AGORA COM LIMITE!)
  async fetchAll(limit: number = 5): Promise<IPatient[]> {
    const result = await this.list({ limit, sortBy: 'updatedAt' });
    return result.patients;
  },

  async search(searchTerm: string): Promise<IPatient[]> {
    const result = await this.list({ search: searchTerm, limit: 100 });
    return result.patients;
  },

  async getTotalPatients(): Promise<{ totalPatients: number }> {
    const result = await this.list({ limit: 1 });
    return { totalPatients: result.pagination.total };
  },

  async getPatientOverview(): Promise<any> {
    const result = await this.list({ limit: 1000 });
    return result.patients.map((p: IPatient) => ({
      name: p.fullName || p.name,
      appointments: p.stats?.totalAppointments || 0
    }));
  }
};

export default patientService;
