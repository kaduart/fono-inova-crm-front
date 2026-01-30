// hooks/useAppointments.ts
import { useCallback, useRef, useState } from 'react';
import appointmentService, {
    AvailableSlotsParams,
    CancelParams,
    CreateAppointmentParams,
    RescheduleParams,
    UpdateAppointmentParams
} from '../services/appointmentService';
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
    
    const isMounted = useRef(true);

    const fetchAppointments = useCallback(async (params = {}, forceRefresh = false) => {
        const now = Date.now();
        
        // Usa cache se válido e não for refresh forçado
        if (!forceRefresh && cache.appointments && cache.timestamp && (now - cache.timestamp < CACHE_DURATION)) {
            if (isMounted.current) {
                setAppointments(cache.appointments!);
            }
            return;
        }

        // Se já está carregando, espera
        if (cache.isLoading && cache.promise) {
            await cache.promise;
            if (isMounted.current) {
                setAppointments(cache.appointments!);
            }
            return;
        }

        cache.isLoading = true;
        if (isMounted.current) setLoading(true);

        const loadPromise = (async () => {
            try {
                const response = await appointmentService.list(params);
                if (isMounted.current) {
                    setAppointments(response.data);
                }
                cache.appointments = response.data;
                cache.timestamp = Date.now();
            } catch (err) {
                console.error('Erro ao buscar agendamentos:', err);
                if (isMounted.current) {
                    setError('Falha ao carregar agendamentos');
                }
            } finally {
                cache.isLoading = false;
                if (isMounted.current) setLoading(false);
            }
        })();

        cache.promise = loadPromise;
        await loadPromise;
        cache.promise = null;
    }, []);

    const createAppointment = useCallback(async (data: CreateAppointmentParams) => {
        try {
            setLoading(true);
            setError(null);
            const response = await appointmentService.create(data);
            // 🔹 Invalida cache e atualiza localmente
            cache.timestamp = 0;
            setAppointments(prev => [...prev, response.data]);
            return response.data;
        } catch (error) {
            setError('Falha ao criar agendamento');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

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

    const completeAppointment = useCallback(async (id: string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await appointmentService.complete(id);
            setAppointments(prev =>
                prev
                    .filter(a => a && a._id) // garante que não tem undefined/null
                    .map(a =>
                        a._id === id ? { ...a, ...response.data } : a
                    )
            );
            return response.data;
        } catch (error) {
            setError('Falha ao completar agendamento');
            throw error;
        } finally {
            setLoading(false);
        }
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
        fetchAppointments,
        createAppointment,
        updateAppointment,
        deleteAppointment,
        fetchAppointmentsByPatient,
        getAvailableSlots,
        confirmAppointment,
        completeAppointment,
        cancelAppointment,
        rescheduleAppointment
    };
};