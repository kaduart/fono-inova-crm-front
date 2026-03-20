import { Appointment } from "../utils/types";
import API from "./api";
import { toast } from 'react-toastify';

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

// ==========================================================
// 👨‍⚕️ Serviço principal do médico
// ==========================================================
export const doctorService = {
  createDoctor: async (data: CreateDoctorParams) => {
    return API.post<Doctor>("/doctors", data);
  },

  getAllDoctors: async () => {
    return API.get<Doctor[]>("/doctors");
  },

  getDoctorById: async (id: string) => {
    return API.get<Doctor>(`/doctors/${id}`);
  },

  deleteDoctor: async (id: string) => {
    return API.delete<{ message: string }>(`/doctors/${id}`);
  },

  updateDoctor: async (id: string, data: CreateDoctorParams) => {
    return API.patch<Doctor>(`/doctors/${id}`, data);
  },

  // 🆕 Soft delete - inativa o profissional
  deactivateDoctor: async (id: string) => {
    return API.patch<{ message: string; doctor: Doctor }>(`/doctors/${id}/deactivate`);
  },

  // 🆕 Reativa um profissional inativado
  reactivateDoctor: async (id: string) => {
    return API.patch<{ message: string; doctor: Doctor }>(`/doctors/${id}/reactivate`);
  },

  // 🆕 Lista apenas profissionais ativos
  getActiveDoctors: async () => {
    return API.get<Doctor[]>("/doctors/active/list");
  },

  // 🆕 Lista apenas profissionais inativos
  getInactiveDoctors: async () => {
    return API.get<Doctor[]>("/doctors/inactive/list");
  },

  getTotalDoctors: async (): Promise<{ totalDoctors: number }> => {
    const response = await API.get("/admin/total-doctors");
    return response.data;
  },

  getDoctorOverview: async (): Promise<any> => {
    const response = await API.get("/admin/doctor-overview");
    return response.data;
  },

  getAppointmentCalendarDoctor: async (id: string): Promise<any> => {
    const response = await API.get(`/doctors/appointments/calendar/${id}`);
    return response.data;
  },

  completeTherapySession: async (sessionId: string) => {
    const res = await API.patch(`/doctors/therapy-sessions/${sessionId}/complete`);
    return res.data;
  },

  // ==========================================================
  // 🔥 NOVO MÉTODO — Resumo de frequência dos pacientes
  // ==========================================================
  getAttendanceSummary: async (doctorId: string) => {
    const res = await API.get(`/doctors/${doctorId}/attendance-summary`);
    return res.data;
  },
};

// ==========================================================
// 🔹 Funções auxiliares de dados
// ==========================================================
export const fetchPatients = async (): Promise<any[]> => {
  console.log('📡 doctorService: Buscando pacientes...');
  const response = await API.get("/doctors/patients");
  console.log('✅ doctorService: Pacientes recebidos:', response.data?.length);
  return response.data;
};

export const fetchStats = async (): Promise<any> => {
  const response = await API.get("/doctors/appointments/stats");
  return response.data;
};

export const fetchTherapySessions = async (): Promise<any[]> => {
  const response = await API.get("/doctors/therapy-sessions");
  return response.data;
};

export const fetchTodaysAppointments = async (): Promise<any[]> => {
  const response = await API.get("/doctors/appointments/today");
  return response.data;
};

export const fetchFutureAppointments = async (): Promise<Appointment[]> => {
  try {
    const response = await API.get("/doctors/appointments/future");
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar agendamentos futuros:", error);
    throw new Error("Não foi possível carregar os agendamentos");
  }
};

export const updateClinicalStatus = async ({ appointmentId, status }: ClinicalStatusUpdate) => {
  try {
    const response = await API.patch(`/appointments/${appointmentId}/clinical-status`, { status });
    toast.success('Agendamento concluído com sucesso!');
  
    return response.data;
  } catch (error: any) {
    console.error("Erro ao atualizar status clínico:", error);
    if (error.response) {
      const { status, data } = error.response;
      if (status === 400) throw new Error(data.error || "Dados inválidos");
      if (status === 403) throw new Error("Sem permissão para atualizar");
      if (status === 404) throw new Error("Agendamento não encontrado");
    }
    throw new Error("Erro ao conectar com o servidor.");
  }
};

// ==========================================================
// 👨‍⚕️ Buscar médico logado
// ==========================================================
export const fetchCurrentDoctor = async () => {
  try {
    const response = await API.get("/users/me");
    return response.data;
  } catch (error) {
    console.error("Error fetching current doctor:", error);
    throw error;
  }
};

export default doctorService;
