// src/services/doctorService.ts
/**
 * Doctor Service V2 - CQRS + Event-Driven (V2 ONLY)
 */

import API from "./api";


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
  weeklyAvailability?: Array<{ day: string; times: string[] }>;
  createdAt?: string;
  updatedAt?: string;
};

export interface CreateDoctorResponse {
  success: boolean;
  data: {
    jobId: string;
    doctorId: string;
    status: 'completed' | 'failed';
    doctor: Doctor;
  };
  message?: string;
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
    options: { onSuccess?: (doctor: Doctor) => void; skipPolling?: boolean } = {}
  ): Promise<{ doctor: Doctor; isAsync: boolean }> {
    const response = await API.post<CreateDoctorResponse>('/v2/doctors', data);
    const doctor = response.data.data.doctor as Doctor;
    options.onSuccess?.(doctor);
    return { doctor, isAsync: false };
  },

  async update(
    id: string,
    data: Partial<CreateDoctorParams>,
    options: { skipPolling?: boolean } = {}
  ): Promise<{ doctor: Doctor; isAsync: boolean }> {
    const response = await API.put(`/v2/doctors/${id}`, data);
    const doctor = (response.data.data.doctor ?? { _id: id, ...data }) as Doctor;
    return { doctor, isAsync: false };
  },

  async delete(
    id: string,
    options: { reason?: string } = {}
  ): Promise<{ isAsync: boolean }> {
    await API.delete(`/v2/doctors/${id}`, { data: { reason: options.reason } });
    return { isAsync: false };
  },

  async deactivate(
    id: string,
    options: { skipPolling?: boolean } = {}
  ): Promise<{ doctor: Doctor; isAsync: boolean }> {
    const response = await API.patch(`/v2/doctors/${id}/deactivate`);
    const doctor = (response.data.data.doctor ?? { _id: id, active: false }) as Doctor;
    return { doctor, isAsync: false };
  },

  async reactivate(
    id: string,
    options: { skipPolling?: boolean } = {}
  ): Promise<{ doctor: Doctor; isAsync: boolean }> {
    const response = await API.patch(`/v2/doctors/${id}/reactivate`);
    const doctor = (response.data.data.doctor ?? { _id: id, active: true }) as Doctor;
    return { doctor, isAsync: false };
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
    // ⚠️ Rota não implementada no backend - retornando dados mockados
    // TODO: Implementar rota /v2/doctors/overview ou /doctors/overview no backend
    console.warn('[DoctorService] getDoctorOverview: Rota não implementada no backend');
    return {
      totalPatients: 0,
      todayAppointments: 0,
      monthlyRevenue: 0,
      attendanceRate: 0
    };
  },

  async getAppointmentCalendarDoctor(id: string): Promise<any> {
    // Rota legada: /doctors/appointments/calendar/:id
    const response = await API.get(`/doctors/appointments/calendar/${id}`);
    return Array.isArray(response.data) ? response.data : response.data?.data || [];
  },

  async completeTherapySession(sessionId: string): Promise<any> {
    // ⚠️ Rota não implementada no backend legado
    console.warn('[DoctorService] completeTherapySession: Rota não implementada no backend');
    return { success: true, message: 'Sessão marcada como concluída (mock)' };
  },

  async getAttendanceSummary(doctorId: string): Promise<any> {
    // Rota legada: /doctors/:id/attendance-summary
    const res = await API.get(`/doctors/${doctorId}/attendance-summary`);
    return res.data?.data || res.data || [];
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
// ⚠️ IMPORTANTE: O backend usa req.user.id do token JWT, não precisa passar doctorId na URL
// 🔄 Os controllers legados retornam array direto, não { success, data }

export const fetchPatients = async (params?: { page?: number; limit?: number; search?: string }) => {
  console.log('[DoctorService] fetchPatients: Chamando /doctors/patients', params);
  try {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    const response = await API.get(`/doctors/patients${qs ? `?${qs}` : ''}`);
    console.log('[DoctorService] fetchPatients: Sucesso', response.data?.data?.length || response.data?.length || 0, 'pacientes');
    // Backend retorna { success, data, meta }
    return response.data?.data || response.data || [];
  } catch (error: any) {
    console.error('[DoctorService] fetchPatients: Erro', error.response?.status, error.response?.data);
    throw error;
  }
};

export const fetchStats = async (_doctorId?: string) => {
  const response = await API.get(`/doctors/appointments/stats`);
  // Backend legado retorna objeto direto
  return response.data?.data || response.data || {};
};

export const fetchTherapySessions = async (_doctorId?: string) => {
  const response = await API.get(`/doctors/therapy-sessions`);
  // Backend legado retorna array direto
  return Array.isArray(response.data) ? response.data : response.data?.data || [];
};

export const fetchTodaysAppointments = async (_doctorId?: string) => {
  const response = await API.get(`/doctors/appointments/today`);
  // Backend legado retorna array direto
  return Array.isArray(response.data) ? response.data : response.data?.data || [];
};

export const fetchFutureAppointments = async (_doctorId?: string) => {
  const response = await API.get(`/doctors/appointments/future`);
  // Backend legado retorna array direto
  return Array.isArray(response.data) ? response.data : response.data?.data || [];
};

export const updateClinicalStatus = async (appointmentId: string, status: string) => {
  // Rota correta: /appointments/:id/clinical-status
  const response = await API.patch(`/appointments/${appointmentId}/clinical-status`, { clinicalStatus: status });
  return response.data?.data || response.data;
};

export default doctorService;
