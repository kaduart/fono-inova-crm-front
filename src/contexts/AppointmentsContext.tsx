import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { appointmentService, PaginationParams } from '../services/appointmentService';
import { IAppointment } from '../utils/types/types';
import { socketManager } from '../utils/socketManager';

interface AppointmentsContextData {
    appointments: IAppointment[];
    fetchAppointments: (filters?: { startDate?: string; endDate?: string }) => Promise<void>;
    createAppointment: (data: any) => Promise<any>;
    updateAppointment: (id: string, data: any) => Promise<any>;
    completeAppointment: (id: string) => Promise<any>;
    cancelAppointment: (id: string, params: any) => Promise<any>;
    getAvailableSlots: (params: any) => Promise<string[]>;
    refreshAppointments: () => Promise<void>;
}

const AppointmentsContext = createContext<AppointmentsContextData>({} as AppointmentsContextData);

export const AppointmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [appointments, setAppointments] = useState<IAppointment[]>([]);
    const [currentFilters, setCurrentFilters] = useState<{ startDate?: string; endDate?: string }>({});

    // ✅ FIX: usando appointmentService.list() corretamente
    const fetchAppointments = useCallback(async (filters?: { startDate?: string; endDate?: string }) => {
        try {
            // Guarda os filtros atuais para usar no refresh
            if (filters) {
                setCurrentFilters(filters);
            }
            
            const params: PaginationParams = {
                limit: 500,
                ...(filters?.startDate && { startDate: filters.startDate }),
                ...(filters?.endDate && { endDate: filters.endDate }),
            };

            const response = await appointmentService.list(params);

            const appointmentsData = Array.isArray(response.data) ? response.data : (response.data?.data || response.data || []);

            setAppointments(appointmentsData);
        } catch (error) {
            console.error('❌ Erro ao buscar appointments:', error);
        }
    }, []);

    // Função para refresh usando os filtros atuais
    const refreshAppointments = useCallback(async () => {
        console.log('🔄 [AppointmentsContext] Refreshing appointments...');
        await fetchAppointments(currentFilters);
    }, [fetchAppointments, currentFilters]);

    // 🔄 Socket listeners para atualização em tempo real
    useEffect(() => {
        console.log('🔌 [AppointmentsContext] Configurando listeners de socket...');
        
        // Quando um agendamento é criado na agenda externa
        const unsubCreated = socketManager.on('appointmentCreated', (data: any) => {
            console.log('📡 [AppointmentsContext] Agendamento criado:', data);
            refreshAppointments();
        });

        // Quando um agendamento é atualizado na agenda externa
        const unsubUpdated = socketManager.on('appointmentUpdated', (data: any) => {
            console.log('📡 [AppointmentsContext] Agendamento atualizado:', data);
            refreshAppointments();
        });

        // Quando um agendamento é deletado na agenda externa
        const unsubDeleted = socketManager.on('appointmentDeleted', (data: any) => {
            console.log('📡 [AppointmentsContext] Agendamento deletado:', data);
            refreshAppointments();
        });

        // Quando um pré-agendamento é importado/confirmado
        const unsubPreImported = socketManager.on('preagendamento:imported', (data: any) => {
            console.log('📡 [AppointmentsContext] Pré-agendamento importado:', data);
            refreshAppointments();
        });

        // Quando um pré-agendamento é descartado
        const unsubPreDiscarded = socketManager.on('preagendamento:discarded', (data: any) => {
            console.log('📡 [AppointmentsContext] Pré-agendamento descartado:', data);
            refreshAppointments();
        });

        // Cleanup
        return () => {
            console.log('🔌 [AppointmentsContext] Removendo listeners de socket...');
            unsubCreated();
            unsubUpdated();
            unsubDeleted();
            unsubPreImported();
            unsubPreDiscarded();
        };
    }, [refreshAppointments]);

    const createAppointment = useCallback(async (data: any) => {
        const result = await appointmentService.create(data);
        // Emite evento socket para notificar outros clients (agenda externa)
        socketManager.emit('appointmentCreated', { appointmentId: result?.data?._id || result?._id });
        return result;
    }, []);

    const updateAppointment = useCallback(async (id: string, data: any) => {
        const result = await appointmentService.update(id, data);
        // Emite evento socket para notificar outros clients (agenda externa)
        socketManager.emit('appointmentUpdated', { appointmentId: id });
        return result;
    }, []);

    const completeAppointment = useCallback(async (id: string) => {
        const result = await appointmentService.complete(id);
        socketManager.emit('appointmentUpdated', { appointmentId: id });
        return result;
    }, []);

    const cancelAppointment = useCallback(async (id: string, params: any) => {
        const result = await appointmentService.cancel(id, params);
        socketManager.emit('appointmentUpdated', { appointmentId: id });
        return result;
    }, []);

    const getAvailableSlots = useCallback(async (params: any) => {
        const result = await appointmentService.getAvailableSlots(params);
        return result.data || [];
    }, []);

    return (
        <AppointmentsContext.Provider value={{
            appointments,
            fetchAppointments,
            createAppointment,
            updateAppointment,
            completeAppointment,
            cancelAppointment,
            getAvailableSlots,
            refreshAppointments
        }}>
            {children}
        </AppointmentsContext.Provider>
    );
};

export const useAppointmentsContext = () => useContext(AppointmentsContext);
