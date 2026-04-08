// src/services/appointmentService.ts
import {
    AppointmentStatus,
    IAppointmentResponse,
    IPaginatedAppointmentResponse,
    TherapyType
} from '../utils/types/types';
import API from './api';
import { extractErrorMessage } from '../utils/errorUtils';

export interface StatusConfig {
    [key: string]: {
        backgroundColor: string;
        textColor: string;
        label: string;
    };
}
export const OPERATIONAL_STATUS_CONFIG: StatusConfig = {
    // 🔹 Inglês (novo padrão do backend)
    scheduled: {
        backgroundColor: "#F59E0B", // Amarelo
        textColor: "#FFFFFF",
        label: "Agendado",
    },
    confirmed: {
        backgroundColor: "#10B981", // Verde
        textColor: "#FFFFFF",
        label: "Confirmado",
    },
    canceled: {
        backgroundColor: "#EF4444", // Vermelho
        textColor: "#FFFFFF",
        label: "Cancelado",
    },
    paid: {
        backgroundColor: "#8B5CF6", // Roxo
        textColor: "#FFFFFF",
        label: "Pago",
    },
    missed: {
        backgroundColor: "#FB923C", // Laranja
        textColor: "#FFFFFF",
        label: "Faltou",
    },
    pending: {
        backgroundColor: "#9CA3AF", // Cinza
        textColor: "#FFFFFF",
        label: "Pendente",
    },
    in_progress: {
        backgroundColor: "#3B82F6", // Azul
        textColor: "#FFFFFF",
        label: "Em andamento",
    },
    completed: {
        backgroundColor: "#2563EB", // Azul forte
        textColor: "#FFFFFF",
        label: "Concluído",
    },
    // 🎯 NOVO: Pré-agendamento - tratado como um status normal
    pre_agendado: {
        backgroundColor: "#EC4899", // Rosa
        textColor: "#FFFFFF",
        label: "Pré-Agendado",
    },
};


export type CreateAppointmentParams = {
    patientId: string;
    doctorId: string;
    date: Date;
    time: string;
    reason: string;
    specialty: string;
    clinicalStatus: 'pending' | 'in_progress' | 'completed' | 'missed';
    operationalStatus: 'scheduled' | 'confirmed' | 'pending' | 'canceled' | 'paid' | 'missed';
};

export interface IAppointmentStatusCount {
    agendado: number;
    concluído: number;
    cancelado: number;
    pre_agendado?: number; // 🎯 NOVO: Contagem de pré-agendamentos
}

export type UpdateAppointmentParams = Partial<{
    doctorId: string;
    date: Date;
    startTime: string;
    duration: number;
    reason: string;
    clinicalStatus: 'pending' | 'in_progress' | 'completed' | 'missed';
    operationalStatus: 'scheduled' | 'confirmed' | 'pending' | 'canceled' | 'paid' | 'missed';
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
    excludePreAgendamentos?: boolean;
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

// 🆕 NOVO: Tipo para slot com metadados
export interface SlotAvailability {
    time: string;
    available: boolean;
    reason?: 'holiday' | 'appointment' | 'blocked';
    label?: string;
}

export const appointmentService = {
    // 🚀 MIGRAÇÃO V2 - Flags de controle
    // true = usa V2 (async, event-driven) | false = usa legado (sync)
    USE_V2_CREATE: true,
    USE_V2_COMPLETE: true,
    USE_V2_LIST: true,  // 🆕 NOVO: Listagem V2 com população completa

    create: async (appointmentData: any) => {
        try {
            const endpoint = appointmentService.USE_V2_CREATE
                ? '/v2/appointments'      // 🔄 Novo fluxo async (202 Accepted)
                : '/appointments';         // 🔄 Legado sync (200 OK)

            console.log(`[AppointmentService] create: ${endpoint} (V2=${appointmentService.USE_V2_CREATE})`);
            const response = await API.post(endpoint, appointmentData);
            return response.data;
        } catch (error) {
            console.error('Erro ao criar agendamento:', error);
            throw error;
        }
    },

    get: async (id: string) => {
        return API.get(`/appointments/patient/${id}`);
    },

    // 🚀 V2: Busca agendamento por ID (para polling de status)
    // 🚀 MIGRAÇÃO V2 - Flag de controle para getById
    USE_V2_GET_BY_ID: true,

    getById: async (id: string) => {
        const endpoint = appointmentService.USE_V2_GET_BY_ID
            ? `/v2/appointments/${id}`  // 🔄 V2 com população completa
            : `/appointments/${id}`;     // 🔄 Legado

        console.log(`[AppointmentService] getById: ${endpoint} (V2=${appointmentService.USE_V2_GET_BY_ID})`);
        return API.get<IAppointmentResponse>(endpoint);
    },

    // 🚀 V2: Endpoint leve para polling de status async (evita buscar objeto completo)
    getStatus: async (id: string) => {
        return API.get(`/v2/appointments/${id}/status`);
    },

    // 🚀 MIGRAÇÃO V2 - Flag de controle para update
    USE_V2_UPDATE: true,

    update: async (id: string, data: UpdateAppointmentParams) => {
        const endpoint = appointmentService.USE_V2_UPDATE
            ? `/v2/appointments/${id}`  // 🔄 V2 sync com eventos
            : `/appointments/${id}`;     // 🔄 Legado

        console.log(`[AppointmentService] update: ${endpoint} (V2=${appointmentService.USE_V2_UPDATE})`);

        const payload = data.startTime && data.duration
            ? { ...data, endTime: calculateEndTime(data.startTime, data.duration) }
            : data;

        return API.put<IAppointmentResponse>(endpoint, payload);
    },

    // 🚀 MIGRAÇÃO V2 - Flag de controle para delete
    USE_V2_DELETE: true,

    delete: async (id: string) => {
        const endpoint = appointmentService.USE_V2_DELETE
            ? `/v2/appointments/${id}`  // 🔄 V2 sync com eventos
            : `/appointments/${id}`;     // 🔄 Legado

        console.log(`[AppointmentService] delete: ${endpoint} (V2=${appointmentService.USE_V2_DELETE})`);
        return API.delete<{ message: string }>(endpoint);
    },

    // 🚀 V2: Listagem com filtros e população completa (única opção)
    list: async (params: { startDate?: string; endDate?: string; page?: number; limit?: number; light?: boolean; patientId?: string; doctorId?: string; _t?: number } = {}) => {
        const queryParams = new URLSearchParams();
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.light) queryParams.append('light', 'true');
        if (params.patientId) queryParams.append('patientId', params.patientId);
        if (params.doctorId) queryParams.append('doctorId', params.doctorId);
        if (params._t) queryParams.append('_t', params._t.toString()); // 🔥 Cache bust

        return API.get(`/v2/appointments?${queryParams.toString()}`);
    },

    // 🚀 MIGRAÇÃO V2 - Flag de controle para confirm
    USE_V2_CONFIRM: true,

    // Operações de status
    confirm: async (id: string, data?: { notes?: string }) => {
        const endpoint = appointmentService.USE_V2_CONFIRM
            ? `/v2/appointments/${id}/confirm`  // 🔄 V2 sync com eventos
            : `/appointments/${id}/confirm`;     // 🔄 Legado

        console.log(`[AppointmentService] confirm: ${endpoint} (V2=${appointmentService.USE_V2_CONFIRM})`);
        return API.patch(endpoint, data);
    },

    // 🚀 MIGRAÇÃO V2 - Flag de controle para reschedule
    USE_V2_RESCHEDULE: true,

    reschedule: async (id: string, data: { date: string; time: string; reason?: string }) => {
        const endpoint = appointmentService.USE_V2_RESCHEDULE
            ? `/v2/appointments/${id}/reschedule`  // 🔄 V2 sync com eventos
            : `/appointments/${id}/reschedule`;     // 🔄 Legado (se existir)

        console.log(`[AppointmentService] reschedule: ${endpoint} (V2=${appointmentService.USE_V2_RESCHEDULE})`);
        return API.patch<IAppointmentResponse>(endpoint, data);
    },

    complete: async (id: string, data?: { addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string }) => {
        const endpoint = appointmentService.USE_V2_COMPLETE
            ? `/v2/appointments/${id}/complete`  // 🔄 Novo fluxo async (202 Accepted)
            : `/appointments/${id}/complete`;     // 🔄 Legado sync (200 OK)

        console.log(`[AppointmentService] complete: ${endpoint} (V2=${appointmentService.USE_V2_COMPLETE})`);
        return API.patch<IAppointmentResponse>(endpoint, data);
    },

    // 🚀 MIGRAÇÃO V2 - Flag de controle para cancelamento event-driven
    USE_V2_CANCEL: true,

    cancel: async (id: string, data: CancelParams) => {
        const endpoint = appointmentService.USE_V2_CANCEL
            ? `/v2/appointments/${id}/cancel`  // 🔄 Novo fluxo async (202 Accepted)
            : `/appointments/${id}/cancel`;     // 🔄 Legado sync (200 OK)

        console.log(`[AppointmentService] cancel: ${endpoint} (V2=${appointmentService.USE_V2_CANCEL})`);
        return API.patch<IAppointmentResponse>(endpoint, data);
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
                startDate: params.startDate,
                endDate: params.endDate
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

    // 🚀 V2: Polling de status para operações async (202 Accepted)
    // Hardened: com tratamento de erro, cancelamento e status robustos
    pollStatus: async (id: string, options?: {
        onComplete?: (data: any) => void;
        onError?: (error: string) => void;
        onMaxAttempts?: () => void;
        onProgress?: (attempt: number, maxAttempts: number) => void;
        maxAttempts?: number;
        interval?: number;
        abortSignal?: AbortSignal;
    }): Promise<{ success: boolean; status?: string; error?: string }> => {
        const { 
            onComplete, 
            onError,
            onMaxAttempts, 
            onProgress,
            maxAttempts = 10, 
            interval = 1000,
            abortSignal 
        } = options || {};
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            // Verifica se foi cancelado
            if (abortSignal?.aborted) {
                console.log(`[pollStatus] Polling cancelado para ${id}`);
                return { success: false, error: 'CANCELLED' };
            }
            
            try {
                await new Promise(resolve => setTimeout(resolve, interval));
                onProgress?.(attempt, maxAttempts);
                
                const response = await API.get(`/v2/appointments/${id}/status`);
                const status = response.data.data;

                // Status de erro do backend
                if (status.operationalStatus === 'failed' || status.operationalStatus === 'error') {
                    const errorMsg = status.statusMessage || 'Processamento falhou';
                    onError?.(errorMsg);
                    return { success: false, status: status.operationalStatus, error: errorMsg };
                }

                // Se resolvido com sucesso (scheduled, confirmed, paid, completed, etc.)
                if (status.isResolved || status.isCompleted || status.operationalStatus === 'scheduled') {
                    onComplete?.(status);
                    return { success: true, status: status.operationalStatus };
                }

                // Se foi cancelado (sucesso para operação de cancelamento)
                if (status.operationalStatus === 'canceled' || status.isCanceled) {
                    onComplete?.(status);
                    return { success: true, status: 'canceled' };
                }

                // Se não está mais processando e não foi resolvido = algo errado
                if (!status.isProcessing && !status.isResolved) {
                    return { success: false, status: status.operationalStatus, error: 'Processamento interrompido' };
                }
            } catch (error: any) {
                console.warn(`[pollStatus] Attempt ${attempt}/${maxAttempts} failed:`, error);
                
                // Se for erro de rede, continua tentando
                // Se for 404, o agendamento pode ter sido deletado
                if (error.response?.status === 404) {
                    return { success: false, error: 'Agendamento não encontrado' };
                }
                
                // Última tentativa falhou
                if (attempt === maxAttempts) {
                    const errorMsg = 'Falha ao verificar status após várias tentativas';
                    onError?.(errorMsg);
                    return { success: false, error: errorMsg };
                }
            }
        }

        onMaxAttempts?.();
        return { success: false, error: 'Tempo de espera excedido' };
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