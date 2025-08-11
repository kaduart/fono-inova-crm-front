import { Appointment } from "../utils/types";
import API from "./api";

export type DoctorRole = 'doctor';

export type CreateDoctorParams = {
    _id?: string; // opcional para criação, obrigatório para atualização
    fullName: string;
    email: string;
    password: string;
    specialty: string;
    licenseNumber: string;
    phoneNumber: string;
    active: string; // pode ser 'true' ou 'false' como string, conforme seu backend
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

export const doctorService = {
    createDoctor: async (data: CreateDoctorParams) => {
        return API.post<Doctor>('/doctors', data);
    },

    getAllDoctors: async () => {
        return API.get<Doctor[]>('/doctors');
    },

    getDoctorById: async (id: string) => {
        return API.get<Doctor>(`/doctors/${id}`);
    },

    deleteDoctor: async (id: string) => {
        return API.delete<{ message: string }>(`/doctors/${id}`);
    },

    updateDoctor: async (id: string, data: CreateDoctorParams) => {
        return API.patch<Doctor>(`/doctors/${id}`, data);
    }
};

export const fetchPatients = async (): Promise<any[]> => {
    const response = await API.get('/doctors/patients');
    return response.data;
};

export const fetchStats = async (): Promise<any> => {
    const response = await API.get('/doctors/appointments/stats');
    return response.data;
};

export const fetchTherapySessions = async (): Promise<any[]> => {
    const response = await API.get('/doctors/therapy-sessions');
    return response.data;
};

export const fetchTodaysAppointments = async (): Promise<any[]> => {
    const response = await API.get('/doctors/appointments/today');
    return response.data;
};

export const updateClinicalStatus = async ({ appointmentId, status }: ClinicalStatusUpdate) => {
    try {
        const response = await API.patch(`/appointments/${appointmentId}/clinical-status`, { status });
        return response.data;
    } catch (error: any) {
        console.error('Erro ao atualizar status clínico:', error);

        // Tratamento de erros específicos
        if (error.response) {
            const { status, data } = error.response;

            if (status === 400) {
                throw new Error(data.error || 'Dados inválidos enviados ao servidor');
            }

            if (status === 403) {
                throw new Error('Você não tem permissão para atualizar este agendamento');
            }

            if (status === 404) {
                throw new Error('Agendamento não encontrado');
            }
        }

        throw new Error('Erro ao conectar com o servidor. Tente novamente mais tarde.');
    }
};
// Função para buscar dados do médico logado
export const fetchCurrentDoctor = async () => {
    try {
        const response = await API.get('/users/me');
        return response.data;
    } catch (error) {
        console.error('Error fetching current doctor:', error);
        throw error;
    }
};

// frontend/services/appointmentService.ts
export const fetchFutureAppointments = async (): Promise<Appointment[]> => {
    try {
        const response = await API.get('/doctors/appointments/future');
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar agendamentos futuros:', error);
        throw new Error('Não foi possível carregar os agendamentos');
    }
};
export default doctorService;
