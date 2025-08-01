// src/services/appointmentService.ts
import {
    AppointmentStatus,
    IAppointmentResponse,
    IPaginatedAppointmentResponse,
    TherapyType
} from '../utils/types/types';
import API from './api';

export interface StatusConfig {
    [key: string]: {
        backgroundColor: string;
        textColor: string;
        label: string;
    };
}
export const OPERATIONAL_STATUS_CONFIG: StatusConfig = {
    agendado: {
        backgroundColor: '#4CAF50', // Verde
        textColor: '#FFFFFF',
        label: 'Agendado'
    },
    confirmado: {
        backgroundColor: '#2196F3', // Azul
        textColor: '#FFFFFF',
        label: 'Confirmado'
    },
    cancelado: {
        backgroundColor: '#F44336', // Vermelho
        textColor: '#FFFFFF',
        label: 'Cancelado'
    },
    pago: {
        backgroundColor: '#9C27B0', // Roxo
        textColor: '#FFFFFF',
        label: 'Pago'
    },
    faltou: {
        backgroundColor: '#FF9800', // Laranja
        textColor: '#FFFFFF',
        label: 'Faltou'
    }
};

export type CreateAppointmentParams = {
    patientId: string;
    doctorId: string;
    date: Date;
    time: string;
    reason: string;
    specialty: string;
    clinicalStatus: 'pendente' | 'em_andamento' | 'concluído' | 'faltou';
    operationalStatus: 'agendado' | 'confirmado' | 'cancelado' | 'pago' | 'faltou';
};

export interface IAppointmentStatusCount {
    agendado: number;
    concluído: number;
    cancelado: number;
}

export type UpdateAppointmentParams = Partial<{
    doctorId: string;
    date: Date;
    startTime: string;
    duration: number;
    reason: string;
    clinicalStatus: 'pendente' | 'em_andamento' | 'concluído' | 'canceled' | 'faltou';
    operationalStatus: 'agendado' | 'confirmado' | 'cancelado' | 'pago' | 'faltou';
    sessionType: TherapyType;
    paymentMethod: string;
    notes: string;
}>;

export type PaginationParams = {
    page?: number;
    limit?: number;
    status?: AppointmentStatus;
    doctorId?: string;
    patientId?: string;
    startDate?: Date;
    endDate?: Date;
    sessionType?: TherapyType;
};

export type RescheduleParams = {
    newDate: Date;
    newStartTime: string;
    duration?: number;
    reason?: string;
    notifyPatient?: boolean;
};

export type CancelParams = {
    reason: string;
    notifyPatient?: boolean;
};

export type AvailableSlotsParams = {
    doctorId: string;
    date: string;
};

export const appointmentService = {
  create: async (appointmentData: any) => {
    try {
      const response = await API.post('/appointments', appointmentData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      throw error;
    }
  },
  
  get: async (id: string) => {
    return API.get(`/appointments/patient/${id}`);
  },

    update: async (id: string, data: UpdateAppointmentParams) => {


        const payload = data.startTime && data.duration
            ? {
                ...data,
                endTime: calculateEndTime(data.startTime, data.duration)
            }
            : data;

        return API.put<IAppointmentResponse>(`/appointments/${id}`, payload);
    },

    delete: async (id: string) => {
        return API.delete<{ message: string }>(`/appointments/${id}`);
    },

    list: async (params: PaginationParams = {}) => {
        return API.get<IPaginatedAppointmentResponse>('/appointments', {
            params: {
                page: params.page || 1,
                limit: params.limit || 20,
                status: params.status,
                doctorId: params.doctorId,
                patientId: params.patientId,
                sessionType: params.sessionType,
                startDate: params.startDate?.toISOString(),
                endDate: params.endDate?.toISOString()
            }
        });
    },

    // Operações de status
    confirm: async (id: string, data?: { notes?: string }) => {
        return API.patch(`/appointments/${id}/confirm`, data);
    },

    complete: async (id: string) => {
        return API.patch<IAppointmentResponse>(`/appointments/${id}/complete`);
    },

    cancel: async (id: string, data: CancelParams) => {

        return API.patch<IAppointmentResponse>(`/appointments/${id}/cancel`, data);
    },


    reschedule: async (id: string, data: RescheduleParams) => {
        const payload = {
            ...data,
            endTime: data.newStartTime && data.duration
                ? calculateEndTime(data.newStartTime, data.duration)
                : undefined
        };
        return API.patch<IAppointmentResponse>(`/appointments/${id}/reschedule`, payload);
    },

    // Consultas
    getAvailableSlots: async (payload: AvailableSlotsParams) => {
        return API.get<any>(`/appointments/available-slots?doctorId=${payload.doctorId}&date=${payload.date}`);
    },

    getDoctorSchedule: async (doctorId: string, date: Date) => {
        return API.get<IAppointmentResponse[]>(`/doctors/${doctorId}/schedule`, {
            params: {
                date: date.toISOString().split('T')[0]
            }
        });
    },

    getPatientAppointments: async (patientId: string, params: PaginationParams = {}) => {
        return API.get<IPaginatedAppointmentResponse>(`/patients/${patientId}/appointments`, {
            params: {
                page: params.page || 1,
                limit: params.limit || 10,
                status: params.status,
                startDate: params.startDate?.toISOString(),
                endDate: params.endDate?.toISOString()
            }
        });
    },

    // Relatórios
    getDailySummary: async (date: Date) => {
        return API.get<{
            scheduled: number;
            confirmed: number;
            completed: number;
            canceled: number;
        }>('/appointments/daily-summary', {
            params: {
                date: date.toISOString().split('T')[0]
            }
        });
    },

    getStatusCount: async (filters?: {
        dateFrom?: string;
        dateTo?: string;
        doctorId?: string;
    }) => {
        // Preparar parâmetros de consulta
        const params = filters ? {
            ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
            ...(filters.dateTo && { dateTo: filters.dateTo }),
            ...(filters.doctorId && { doctorId: filters.doctorId }),
        } : undefined;

        return API.get<{
            success: boolean;
            data: IAppointmentStatusCount
        }>('/appointments/count-by-status', { params });
    },
};

// Funções auxiliares
function calculateEndTime(startTime: string, duration: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(startDate.getTime() + duration * 60000);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
}

// Validações
export const validateAppointment = (appointment: CreateAppointmentParams) => {
    if (!appointment.patientId) throw new Error('Paciente é obrigatório');
    if (!appointment.doctorId) throw new Error('Profissional é obrigatório');
    if (!appointment.date) throw new Error('Data é obrigatória');
    if (!appointment.time) throw new Error('Hora de início é obrigatória');
    if (!appointment.reason) throw new Error('Motivo é obrigatório');

    const appointmentDate = new Date(
        `${appointment.date.toISOString().split('T')[0]}T${appointment.time}`
    );

    if (appointmentDate < new Date()) {
        throw new Error('Não é possível agendar para datas/horários passados');
    }
};

export default appointmentService;