// src/services/doctorService.ts
/**
 * Doctor Service V2 - CQRS + Event-Driven (V2 ONLY)
 */

import API from "./api";

const POLL_CONFIG = {
  maxAttempts: 30,
  interval: 800,
  backoffMultiplier: 1.2
};

export type DoctorRole = 'doctor';

export type CreateDoctorParams = {
  _id?: string;
  fullName: string;
  email: string;
  password: string;
  specialty: string;
  licenseNumber: string;
  phoneNumber: string;
  active: string;
  role?: DoctorRole;
};

export type Doctor = {
  _id: string;
  fullName: string;
  email: string;
  specialty: string;
  licenseNumber: string;
  phoneNumber: string;
  active: string;
  role: DoctorRole;
  createdAt?: string;
  updatedAt?: string;
};

export interface CreateDoctorResponse {
  success: boolean;
  data: {
    eventId: string;
    correlationId: string;
    jobId: string;
    doctorId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    checkStatusUrl: string;
    estimatedTime: string;
  };
  message?: string;
}

export interface DoctorStatusResponse {
  success: boolean;
  data: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    doctorView?: Doctor;
    error?: string;
    processedAt?: string;
  };
}

export interface ListDoctorsResponse {
  success: boolean;
  data: {
    doctors: Doctor[];
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
): Promise<DoctorStatusResponse['data']> {
  const { onProgress, onSuccess, onError } = options;
  let interval = POLL_CONFIG.interval;

  for (let attempt = 1; attempt <= POLL_CONFIG.maxAttempts; attempt++) {
    try {
      const response = await API.get<DoctorStatusResponse>(`/v2/doctors/status/${eventId}`);
      const { status, doctorView, error } = response.data.data;

      onProgress?.(status, attempt);

      if (status === 'completed') {
        onSuccess?.(doctorView);
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

  throw new Error('Timeout aguardando processamento do profissional');
}

export const doctorService = {
  async list(options: {
    search?: string;
    limit?: number;
    skip?: number;
    status?: 'active' | 'inactive' | 'all';
  } = {}): Promise<ListDoctorsResponse['data']> {
    const { search, limit = 50, skip = 0, status = 'all' } = options;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', limit.toString());
    params.append('skip', skip.toString());
    params.append('status', status);

    const response = await API.get<ListDoctorsResponse>(`/v2/doctors?${params}`);
    return response.data.data;
  },

  async getById(id: string): Promise<Doctor> {
    const response = await API.get(`/v2/doctors/${id}`);
    return response.data.data;
  },

  async getActiveDoctors(): Promise<{ data: Doctor[] }> {
    const response = await API.get<ListDoctorsResponse>('/v2/doctors?status=active');
    return { data: response.data.data.doctors };
  },

  async getInactiveDoctors(): Promise<{ data: Doctor[] }> {
    const response = await API.get<ListDoctorsResponse>('/v2/doctors?status=inactive');
    return { data: response.data.data.doctors };
  },

  async create(
    data: CreateDoctorParams,
    options: {
      onProgress?: (status: string, attempt: number) => void;
      onSuccess?: (doctor: Doctor) => void;
      onError?: (error: string) => void;
      skipPolling?: boolean;
    } = {}
  ): Promise<{ doctor: Doctor; isAsync: boolean; eventId?: string }> {
    const { onProgress, onSuccess, onError, skipPolling } = options;
    const response = await API.post<CreateDoctorResponse>('/v2/doctors', data);
    const { eventId, doctorId, status } = response.data.data;

    if (status === 'completed') {
      const doctor = await this.getById(doctorId);
      onSuccess?.(doctor);
      return { doctor, isAsync: false };
    }

    if (skipPolling) {
      return {
        doctor: { ...data, _id: doctorId, id: doctorId, status: 'creating', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Doctor,
        isAsync: true,
        eventId
      };
    }

    const finalStatus = await pollEventStatus(eventId, {
      onProgress,
      onSuccess: (view) => onSuccess?.(view as Doctor),
      onError
    });

    const doctor = finalStatus.doctorView || await this.getById(doctorId);
    return { doctor, isAsync: true, eventId };
  },

  async update(
    id: string,
    data: Partial<CreateDoctorParams>,
    options: { onProgress?: (status: string, attempt: number) => void; skipPolling?: boolean } = {}
  ): Promise<{ doctor: Doctor; isAsync: boolean; eventId?: string }> {
    const response = await API.put(`/v2/doctors/${id}`, data);
    const { eventId, status } = response.data.data;

    if (status === 'completed') {
      const doctor = await this.getById(id);
      return { doctor, isAsync: false };
    }

    if (options.skipPolling) {
      return { doctor: { _id: id, ...data } as Doctor, isAsync: true, eventId };
    }

    await pollEventStatus(eventId, { onProgress: options.onProgress });
    const doctor = await this.getById(id);
    return { doctor, isAsync: true, eventId };
  },

  async delete(
    id: string,
    options: { reason?: string; onProgress?: (status: string, attempt: number) => void; skipPolling?: boolean } = {}
  ): Promise<{ isAsync: boolean; eventId?: string }> {
    const response = await API.delete(`/v2/doctors/${id}`, { data: { reason: options.reason } });
    const { eventId, status } = response.data.data;

    if (status === 'completed') return { isAsync: false };
    if (options.skipPolling) return { isAsync: true, eventId };

    await pollEventStatus(eventId, { onProgress: options.onProgress });
    return { isAsync: true, eventId };
  },

  async deactivate(
    id: string,
    options: { onProgress?: (status: string, attempt: number) => void; skipPolling?: boolean } = {}
  ): Promise<{ doctor: Doctor; isAsync: boolean; eventId?: string }> {
    const response = await API.patch(`/v2/doctors/${id}/deactivate`);
    const { eventId, status } = response.data.data;

    if (status === 'completed') {
      const doctor = await this.getById(id);
      return { doctor, isAsync: false };
    }

    if (options.skipPolling) {
      return { doctor: { _id: id, active: 'false' } as Doctor, isAsync: true, eventId };
    }

    await pollEventStatus(eventId, { onProgress: options.onProgress });
    const doctor = await this.getById(id);
    return { doctor, isAsync: true, eventId };
  },

  async reactivate(
    id: string,
    options: { onProgress?: (status: string, attempt: number) => void; skipPolling?: boolean } = {}
  ): Promise<{ doctor: Doctor; isAsync: boolean; eventId?: string }> {
    const response = await API.patch(`/v2/doctors/${id}/reactivate`);
    const { eventId, status } = response.data.data;

    if (status === 'completed') {
      const doctor = await this.getById(id);
      return { doctor, isAsync: false };
    }

    if (options.skipPolling) {
      return { doctor: { _id: id, active: 'true' } as Doctor, isAsync: true, eventId };
    }

    await pollEventStatus(eventId, { onProgress: options.onProgress });
    const doctor = await this.getById(id);
    return { doctor, isAsync: true, eventId };
  },

  async getEventStatus(eventId: string): Promise<DoctorStatusResponse['data']> {
    const response = await API.get<DoctorStatusResponse>(`/v2/doctors/status/${eventId}`);
    return response.data.data;
  },

  // Compatibilidade com código legado
  async getAllDoctors(): Promise<{ data: Doctor[] }> {
    const result = await this.list({ status: 'all' });
    return { data: result.doctors };
  },

  async getDoctorById(id: string): Promise<{ data: Doctor }> {
    const doctor = await this.getById(id);
    return { data: doctor };
  },

  async getTotalDoctors(): Promise<{ totalDoctors: number }> {
    const result = await this.list({ status: 'all', limit: 1 });
    return { totalDoctors: result.pagination.total };
  },

  async getDoctorOverview(): Promise<any> {
    const response = await API.get('/v2/doctors/overview');
    return response.data.data;
  },

  async getAppointmentCalendarDoctor(id: string): Promise<any> {
    const response = await API.get(`/v2/doctors/${id}/appointments/calendar`);
    return response.data.data;
  },

  async completeTherapySession(sessionId: string): Promise<any> {
    const res = await API.patch(`/v2/doctors/therapy-sessions/${sessionId}/complete`);
    return res.data.data;
  },

  async getAttendanceSummary(doctorId: string): Promise<any> {
    const res = await API.get(`/v2/doctors/${doctorId}/attendance-summary`);
    return res.data.data;
  },

  // Alias para compatibilidade
  async createDoctor(data: CreateDoctorParams) {
    const result = await this.create(data);
    return { data: result.doctor };
  },

  async updateDoctor(id: string, data: Partial<CreateDoctorParams>) {
    const result = await this.update(id, data);
    return { data: result.doctor };
  },

  async deleteDoctor(id: string) {
    await this.delete(id);
    return { data: { message: 'Médico deletado com sucesso' } };
  },

  async deactivateDoctor(id: string) {
    const result = await this.deactivate(id);
    return { data: { message: 'Médico inativado com sucesso', doctor: result.doctor } };
  },

  async reactivateDoctor(id: string) {
    const result = await this.reactivate(id);
    return { data: { message: 'Médico reativado com sucesso', doctor: result.doctor } };
  }
};

// Funções auxiliares para compatibilidade (migrar para V2 posteriormente)
export const fetchPatients = async (doctorId: string) => {
  const response = await API.get(`/v2/doctors/${doctorId}/patients`);
  return response.data.data;
};

export const fetchStats = async (doctorId: string) => {
  const response = await API.get(`/v2/doctors/${doctorId}/stats`);
  return response.data.data;
};

export const fetchTherapySessions = async (doctorId: string) => {
  const response = await API.get(`/v2/doctors/${doctorId}/sessions`);
  return response.data.data;
};

export const fetchTodaysAppointments = async (doctorId: string) => {
  const response = await API.get(`/v2/doctors/${doctorId}/appointments/today`);
  return response.data.data;
};

export const fetchFutureAppointments = async (doctorId: string) => {
  const response = await API.get(`/v2/doctors/${doctorId}/appointments/future`);
  return response.data.data;
};

export const updateClinicalStatus = async (doctorId: string, status: string) => {
  const response = await API.patch(`/v2/doctors/${doctorId}/clinical-status`, { status });
  return response.data.data;
};

export default doctorService;
