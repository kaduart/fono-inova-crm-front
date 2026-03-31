// hooks/useAppointments.ts
import { useCallback, useRef, useState } from 'react';
import appointmentService, {
    AvailableSlotsParams,
    CancelParams,
    CreateAppointmentParams,
    PaginationParams,
    RescheduleParams,
    UpdateAppointmentParams
} from '../services/appointmentService';
import { useAppointmentPolling } from './useAppointmentPolling';
import { IAppointment } from '../utils/types/types';

// 🔹 Cache para evitar recarregamentos desnecessários
const cache = {
    appointments: null as IAppointment[] | null,
    timestamp: 0,
    isLoading: false,
    promise: null as Promise<void> | null
};

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos (dados mais voláteis)

export const useAppointments = () => {
    const [appointments, setAppointments] = useState<IAppointment[]>(cache.appointments || []);
    const [loading, setLoading] = useState(cache.isLoading);
    const [error, setError] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);

    // 🚀 V2: Hook centralizado de polling
    const { 
        pollingState, 
        pollAppointment, 
        cancelPolling, 
        isPolling 
    } = useAppointmentPolling();

    const isMounted = useRef(true);

    // ✅ FIX: fetchAppointments usando V2 ou legado conforme flag
    const fetchAppointments = useCallback(async (filters?: { startDate?: string; endDate?: string; light?: boolean }) => {
        try {
            let response;

            // 🚀 V2: Usa endpoint V2 se flag ativada
            if (appointmentService.USE_V2_LIST) {
                response = await appointmentService.listV2({
                    startDate: filters?.startDate,
                    endDate: filters?.endDate,
                    limit: filters?.light ? 200 : 100,
                    light: filters?.light
                });
                // V2 retorna { success, data: { appointments, pagination } }
                setAppointments(response.data.data?.appointments || response.data.data || []);
            } else {
                // Legado
                const params: PaginationParams = {
                    limit: 500,
                    ...(filters?.startDate && { startDate: new Date(filters.startDate) }),
                    ...(filters?.endDate && { endDate: new Date(filters.endDate) }),
                };
                response = await appointmentService.list(params);
                setAppointments(response.data.data || response.data || []);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar appointments:', error);
            // Fallback silencioso ou usar notificação global se disponível
        }
    }, []);

    const createAppointment = useCallback(async (data: CreateAppointmentParams, options?: {
        onSuccess?: () => void;
        onError?: (error: Error) => void;
    }) => {
        try {
            setLoading(true);
            setError(null);
            const response = await appointmentService.create(data);

            // 🚀 V2: Se for 202 Accepted, agendamento está em processamento
            if (response.status === 202) {
                console.log('[useAppointments] V2: Agendamento em processamento:', response.data);
                
                const appointmentId = response.data.data?.appointmentId;
                if (appointmentId) {
                    // Inicia polling
                    const completed = await appointmentService.pollStatus(appointmentId, {
                        onComplete: () => {
                            console.log('[useAppointments] Agendamento criado com sucesso!');
                            cache.timestamp = 0;
                            fetchAppointments();
                            options?.onSuccess?.();
                        },
                        onMaxAttempts: () => {
                            options?.onError?.(new Error('Tempo de processamento excedido'));
                        },
                        maxAttempts: 10,
                        interval: 1000
                    });

                    if (!completed) {
                        throw new Error('Processamento não completado no tempo esperado');
                    }
                }

                return {
                    ...response.data,
                    _isAsyncProcessing: true,
                    _message: 'Agendamento criado com sucesso!'
                };
            }

            // Legado: Atualiza imediatamente
            cache.timestamp = 0;
            setAppointments(prev => [...prev, response.data]);
            options?.onSuccess?.();
            return response.data;
        } catch (error) {
            setError('Falha ao criar agendamento');
            options?.onError?.(error as Error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [fetchAppointments]);

    const updateAppointment = useCallback(async (id: string, data: UpdateAppointmentParams) => {
        try {
            setLoading(true);
            setError(null);
            const response = await appointmentService.update(id, data);
            // 🔹 Invalida cache e atualiza localmente
            cache.timestamp = 0;
            setAppointments(prev =>
                prev
                    .filter(a => a && a._id)
                    .map(a =>
                        a._id === id ? { ...a, ...response.data } : a
                    )
            );
            return response.data;
        } catch (error) {
            setError('Falha ao atualizar agendamento');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteAppointment = useCallback(async (id: string) => {
        try {
            setLoading(true);
            await appointmentService.delete(id);
            // 🔹 Invalida cache e atualiza localmente
            cache.timestamp = 0;
            setAppointments(prev => prev.filter(a => a._id !== id));
        } catch (error) {
            setError('Falha ao remover agendamento');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAppointmentsByPatient = useCallback(async (id: string) => {
        try {
            setLoading(true);
            const response = await appointmentService.get(id);
            return response.data;
        } catch (error) {
            setError('Falha ao buscar agendamento');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const getAvailableSlots = useCallback(async (params: AvailableSlotsParams) => {
        try {
            setLoading(true);
            setError(null);
            const response = await appointmentService.getAvailableSlots(params);
            setAvailableSlots(response.data);
            return response.data;
        } catch (error) {
            setError('Falha ao buscar horários disponíveis');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const confirmAppointment = useCallback(async (id: string, notes?: string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await appointmentService.confirm(id, { notes });
            setAppointments(prev =>
                prev
                    .filter(a => a && a._id) // garante que não tem undefined/null
                    .map(a =>
                        a._id === id ? { ...a, ...response.data } : a
                    )
            );
            return response.data;
        } catch (error) {
            setError('Falha ao confirmar agendamento');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const completeAppointment = useCallback(async (id: string, data?: { addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string }, options?: {
        onSuccess?: () => void;
        onError?: (error: Error) => void;
    }) => {
        try {
            setLoading(true);
            setError(null);
            const response = await appointmentService.complete(id, data);

            // 🚀 V2: Se for 202 Accepted, inicia polling para atualização
            if (response.status === 202) {
                console.log('[useAppointments] V2: Agendamento em processamento, iniciando polling...');

                // Inicia polling usando o service
                const completed = await appointmentService.pollStatus(id, {
                    onComplete: (status) => {
                        console.log('[useAppointments] Polling completado:', status);
                        // Atualiza o estado com os dados mais recentes
                        appointmentService.getById(id).then(updated => {
                            setAppointments(prev =>
                                prev
                                    .filter(a => a && a._id)
                                    .map(a => a._id === id ? { ...a, ...updated.data } : a)
                            );
                        });
                        options?.onSuccess?.();
                    },
                    onMaxAttempts: () => {
                        console.warn('[useAppointments] Polling atingiu máximo de tentativas');
                        options?.onError?.(new Error('Tempo de processamento excedido'));
                    },
                    maxAttempts: 10,
                    interval: 1000
                });

                if (!completed) {
                    throw new Error('Processamento não completado no tempo esperado');
                }

                return {
                    ...response.data,
                    _isAsyncProcessing: true,
                    _message: 'Agendamento finalizado com sucesso!'
                };
            }

            // Legado: Atualiza imediatamente
            setAppointments(prev =>
                prev
                    .filter(a => a && a._id)
                    .map(a =>
                        a._id === id ? { ...a, ...response.data } : a
                    )
            );
            options?.onSuccess?.();
            return response.data;
        } catch (error) {
            setError('Falha ao completar agendamento');
            options?.onError?.(error as Error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    // 🚀 V2: Polling inteligente para verificar status do agendamento
    const pollAppointmentStatus = useCallback(async (id: string, maxAttempts = 5): Promise<boolean> => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`[useAppointments] Polling attempt ${attempt}/${maxAttempts}...`);

                // Aguarda 1 segundo entre tentativas
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Busca status atualizado
                const updated = await appointmentService.getById(id);

                // Verifica se já foi completado
                if (updated.data?.operationalStatus === 'completed' ||
                    updated.data?.clinicalStatus === 'completed') {
                    console.log('[useAppointments] Agendamento completado!');

                    // Atualiza estado
                    setAppointments(prev =>
                        prev
                            .filter(a => a && a._id)
                            .map(a =>
                                a._id === id ? { ...a, ...updated.data } : a
                            )
                    );
                    return true;
                }
            } catch (err) {
                console.warn(`[useAppointments] Polling attempt ${attempt} falhou:`, err);
            }
        }

        console.warn('[useAppointments] Max polling attempts reached');
        return false;
    }, []);

    const cancelAppointment = useCallback(async (id: string, data: CancelParams) => {
        try {

            setLoading(true);
            setError(null);
            const response = await appointmentService.cancel(id, data);
            setAppointments(prev =>
                prev
                    .filter(a => a && a._id) // garante que não tem undefined/null
                    .map(a =>
                        a._id === id ? { ...a, ...response.data } : a
                    )
            );
            return response.data;
        } catch (error) {
            setError('Falha ao cancelar agendamento');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const rescheduleAppointment = useCallback(async (id: string, data: RescheduleParams) => {
        try {
            setLoading(true);
            setError(null);
            const response = await appointmentService.reschedule(id, data);
            setAppointments(prev =>
                prev
                    .filter(a => a && a._id) // garante que não tem undefined/null
                    .map(a =>
                        a._id === id ? { ...a, ...response.data } : a
                    )
            );
            return response.data;
        } catch (error) {
            setError('Falha ao reagendar agendamento');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        appointments,
        loading,
        error,
        availableSlots,
        // 🚀 V2: Estados e controles de polling
        pollingState,
        isPolling,
        cancelPolling,
        fetchAppointments,
        createAppointment,
        updateAppointment,
        deleteAppointment,
        fetchAppointmentsByPatient,
        getAvailableSlots,
        confirmAppointment,
        completeAppointment,
        pollAppointmentStatus, // 🚀 V2: Polling para atualização async (legado)
        pollAppointment,       // 🚀 V2: Polling centralizado (novo)
        cancelAppointment,
        rescheduleAppointment
    };
};