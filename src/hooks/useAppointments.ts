// hooks/useAppointments.ts
import { useCallback, useState } from 'react';
import appointmentService, {
    AvailableSlotsParams,
    CancelParams,
    CreateAppointmentParams,
    RescheduleParams,
    UpdateAppointmentParams
} from '../services/appointmentService';
import { IAppointment } from '../utils/types/types';

export const useAppointments = () => {
    const [appointments, setAppointments] = useState<IAppointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);

    const fetchAppointments = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await appointmentService.list(params);
            setAppointments(response.data);
        } catch (err) {
            setError('Falha ao carregar agendamentos');
            console.error('Erro ao buscar agendamentos:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const createAppointment = useCallback(async (data: CreateAppointmentParams) => {
        try {
            setLoading(true);
            setError(null);
            const response = await appointmentService.create(data);
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
            setAppointments(prev => prev.map(a =>
                a._id === id ? { ...a, ...response.data } : a
            ));
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
            setAppointments(prev => prev.map(a =>
                a._id === id ? { ...a, ...response.data } : a
            ));
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
            setAppointments(prev => prev.map(a =>
                a._id === id ? { ...a, ...response.data } : a
            ));
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
            setAppointments(prev => prev.map(a =>
                a._id === id ? { ...a, ...response.data } : a
            ));
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
            setAppointments(prev => prev.map(a =>
                a._id === id ? { ...a, ...response.data } : a
            ));
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