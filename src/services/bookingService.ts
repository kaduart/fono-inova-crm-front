// src/services/bookingService.ts
/**
 * Booking Service V2 - Event-Driven
 * 
 * Substitui o endpoint legado POST /patient/book-appointment
 * Usa o fluxo Event-Driven de appointments (202 Accepted + Polling)
 */

import API from './api';
import { appointmentService } from './appointmentService';
import { extractErrorMessage } from '../utils/errorUtils';

export interface BookAppointmentParams {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  reason: string;
  specialty?: string;
  notes?: string;
}

export interface BookAppointmentResponse {
  success: boolean;
  data: {
    eventId: string;
    appointmentId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    checkStatusUrl: string;
    estimatedTime: string;
  };
  message?: string;
}

/**
 * 🚀 V2: Cria agendamento via fluxo Event-Driven
 * 
 * Este serviço substitui o endpoint legado /patient/book-appointment
 * Usa o mesmo fluxo de appointments V2 (202 Accepted + Polling)
 */
export const bookingService = {
  /**
   * Cria um novo agendamento usando o fluxo Event-Driven V2
   * 
   * @param data - Dados do agendamento
   * @param options - Callbacks para acompanhamento do processamento
   * @returns Resultado do agendamento com polling automático
   */
  async bookAppointment(
    data: BookAppointmentParams,
    options: {
      onProgress?: (status: string, progress: number) => void;
      onSuccess?: (result: any) => void;
      onError?: (error: string) => void;
      skipPolling?: boolean;
    } = {}
  ) {
    const { onProgress, onSuccess, onError, skipPolling } = options;

    // Prepara payload compatível com V2
    const payload = {
      patientId: data.patientId,
      doctorId: data.doctorId,
      date: data.date,
      time: data.time,
      reason: data.reason,
      specialty: data.specialty || 'avaliação',
      clinicalStatus: 'pending',
      operationalStatus: 'scheduled',
      notes: data.notes
    };

    try {
      // Usa o endpoint V2 de appointments
      const response = await API.post('/v2/appointments', payload);

      // Se for 202 Accepted, inicia polling
      if (response.status === 202 || response.data?.data?.status?.startsWith('processing')) {
        const { eventId, appointmentId } = response.data.data;

        onProgress?.('processing', 10);

        if (skipPolling) {
          return {
            success: true,
            isAsync: true,
            eventId,
            appointmentId,
            data: response.data.data
          };
        }

        // Polling automático via appointmentService
        const pollResult = await appointmentService.pollStatus(appointmentId, {
          onProgress: (attempt, maxAttempts) => {
            const progress = Math.min(10 + (attempt / maxAttempts) * 80, 90);
            onProgress?.('processing', Math.round(progress));
          },
          onComplete: (data) => {
            onProgress?.('completed', 100);
            onSuccess?.(data);
          },
          onError: (error) => {
            onError?.(error);
          },
          maxAttempts: 15,
          interval: 1000
        });

        if (pollResult.success) {
          return {
            success: true,
            isAsync: true,
            eventId,
            appointmentId,
            status: pollResult.status
          };
        } else {
          throw new Error(pollResult.error || 'Falha ao processar agendamento');
        }
      }

      // Resposta síncrona (raro, mas possível)
      onSuccess?.(response.data);
      return {
        success: true,
        isAsync: false,
        data: response.data
      };

    } catch (error: any) {
      const errorMsg = extractErrorMessage(error, 'Erro ao criar agendamento');
      onError?.(errorMsg);
      throw error;
    }
  },

  /**
   * Consulta status de um agendamento em processamento
   */
  async getBookingStatus(eventId: string) {
    const response = await API.get(`/v2/appointments/events/${eventId}/status`);
    return response.data;
  }
};

export default bookingService;
