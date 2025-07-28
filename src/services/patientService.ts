// src/services/patientService.ts
import { normalizeIPatient } from "../utils/normalize";
import { IPatient } from "../utils/types/types";
import API from "./api";
import { getAuthToken } from "./authService";

// Interceptor para autenticação
API.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor para tratamento global de erros
API.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            // Lógica para logout ou renovação de token
        }
        return Promise.reject(error);
    }
);

export const patientService = {
    /**
     * Busca todos os pacientes com opção de incluir resumo de consultas
     */
    fetchAll: async (withAppointments = false): Promise<any[]> => {
        const patients = await API.get<IPatient[]>('/patients').then(res => res.data);
        if (!withAppointments) {
            return patients;
        }

        return Promise.all(
            patients.map(async patient => ({
                ...patient,
                ...await patientService.getAppointmentsSummary(patient._id)
            }))
        );
    },

    async create(data: IPatient): Promise<IPatient> {
        // Normaliza os dados antes de enviar
        const normalizedData = normalizeIPatient(data);

        try {
            const response = await API.post<IPatient>('/patients/add', normalizedData);
            return response.data;
        } catch (error) {
            // Tratamento específico para erros de duplicidade
            if (error.response?.data?.error?.includes('E11000')) {
                throw new Error('Dados duplicados: CPF, RG ou Email já cadastrado');
            }
            throw error;
        }
    },

    fetchById: (id: string): Promise<IPatient> =>
        API.get<IPatient>(`/patients/${id}`).then(res => res.data),

    update: (id: string, data: Partial<IPatient>): Promise<IPatient> =>
        API.put<IPatient>(`/patients/${id}`, data).then(res => res.data),

    delete: (id: string): Promise<void> =>
        API.delete(`/patients/${id}`),

    getAppointmentsSummary: (id: string): Promise<{
        lastAppointment: any;
        nextAppointment: any;
    }> => API.get(`/patients/${id}/appointments-summary`).then(res => {
        return res.data
    }),

    getPatientSessions: (patientId: string): Promise<any[]> =>
        API.get(`/patients/${patientId}/sessions`).then(res => res.data),
};