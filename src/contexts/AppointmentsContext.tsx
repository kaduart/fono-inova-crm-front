import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { appointmentService, PaginationParams } from '../services/appointmentService';
import { IAppointment } from '../utils/types/types';
import { socketManager } from '../utils/socketManager';
import { invalidateCache } from '../utils/cacheManager';

interface AppointmentsContextData {
    appointments: IAppointment[];
    fetchAppointments: (filters?: { startDate?: string; endDate?: string }) => Promise<void>;
    createAppointment: (data: any) => Promise<any>;
    updateAppointment: (id: string, data: any) => Promise<any>;
    completeAppointment: (id: string, data?: { addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string }) => Promise<any>;
    pollAppointmentStatus: (id: string, maxAttempts?: number) => Promise<boolean>; // 🚀 V2: Polling para atualização async
    cancelAppointment: (id: string, params: any) => Promise<any>;
    getAvailableSlots: (params: any) => Promise<string[]>;
    refreshAppointments: () => Promise<void>;
}

const AppointmentsContext = createContext<AppointmentsContextData>({} as AppointmentsContextData);

export const AppointmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [appointments, setAppointments] = useState<IAppointment[]>([]);
    const [currentFilters, setCurrentFilters] = useState<{ startDate?: string; endDate?: string }>({});
    
    // Ref para debounce de socket events
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingRefreshRef = useRef(false);

    const fetchAppointments = useCallback(async (filters?: { startDate?: string; endDate?: string }) => {
        try {
            if (filters) {
                setCurrentFilters(filters);
            }
            
            const params: PaginationParams = {
                limit: 500,
                excludePreAgendamentos: true,
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

    const refreshAppointments = useCallback(async () => {
        console.log('🔄 [AppointmentsContext] Refreshing appointments...');
        await fetchAppointments(currentFilters);
    }, [fetchAppointments, currentFilters]);

    // 🔄 Debounced refresh para evitar múltiplas chamadas
    const debouncedRefresh = useCallback(() => {
        pendingRefreshRef.current = true;
        
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
        }
        
        refreshTimeoutRef.current = setTimeout(() => {
            if (pendingRefreshRef.current) {
                pendingRefreshRef.current = false;
                refreshAppointments();
            }
        }, 1000); // 1 segundo de debounce
    }, [refreshAppointments]);

    useEffect(() => {
        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, []);

    // 🔄 Socket listeners com debounce
    useEffect(() => {
        console.log('🔌 [AppointmentsContext] Configurando listeners de socket...');
        
        const handleSocketEvent = (eventName: string) => (data: any) => {
            console.log(`📡 [AppointmentsContext] ${eventName}:`, data);
            debouncedRefresh();
        };

        const unsubCreated = socketManager.on('appointmentCreated', handleSocketEvent('Agendamento criado'));
        const unsubUpdated = socketManager.on('appointmentUpdated', handleSocketEvent('Agendamento atualizado'));
        const unsubDeleted = socketManager.on('appointmentDeleted', handleSocketEvent('Agendamento deletado'));
        const unsubPreImported = socketManager.on('preagendamento:imported', handleSocketEvent('Pré-agendamento importado'));
        const unsubPreDiscarded = socketManager.on('preagendamento:discarded', handleSocketEvent('Pré-agendamento descartado'));

        return () => {
            console.log('🔌 [AppointmentsContext] Removendo listeners de socket...');
            unsubCreated();
            unsubUpdated();
            unsubDeleted();
            unsubPreImported();
            unsubPreDiscarded();
        };
    }, [debouncedRefresh]);

    const createAppointment = useCallback(async (data: any) => {
        const result = await appointmentService.create(data);

        // 🚀 V2: Se for processamento async (status 202), não emite socket ainda
        if (result?._isAsyncProcessing) {
            console.log('[AppointmentsContext] V2: Agendamento em criação async, aguardando...');
            return result;
        }

        // Legado: Invalida caches e emite socket
        invalidateCache('dashboard');
        invalidateCache('doctorStats');
        socketManager.emit('appointmentCreated', { appointmentId: result?.data?._id || result?._id });
        return result;
    }, []);

    const updateAppointment = useCallback(async (id: string, data: any) => {
        const result = await appointmentService.update(id, data);
        
        // 🚀 Invalida caches relacionados
        invalidateCache('dashboard');
        invalidateCache('doctorStats');
        
        socketManager.emit('appointmentUpdated', { appointmentId: id });
        return result;
    }, []);

    const completeAppointment = useCallback(async (id: string, data?: { addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string }) => {
        const result = await appointmentService.complete(id, data);

        // 🚀 Invalida caches relacionados
        invalidateCache('dashboard');
        invalidateCache('doctorStats');

        socketManager.emit('appointmentUpdated', { appointmentId: id });
        return result;
    }, []);

    // 🚀 V2: Polling inteligente para aguardar processamento async
    const pollAppointmentStatus = useCallback(async (id: string, maxAttempts = 5): Promise<boolean> => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`[AppointmentsContext] Polling ${attempt}/${maxAttempts}...`);
                await new Promise(resolve => setTimeout(resolve, 1000));

                const updated = await appointmentService.getById(id);

                if (updated.data?.operationalStatus === 'completed' ||
                    updated.data?.clinicalStatus === 'completed') {
                    console.log('[AppointmentsContext] Agendamento completado!');

                    // Atualiza cache e estado
                    invalidateCache('dashboard');
                    invalidateCache('doctorStats');
                    return true;
                }
            } catch (err) {
                console.warn(`[AppointmentsContext] Polling ${attempt} falhou:`, err);
            }
        }
        return false;
    }, []);

    const cancelAppointment = useCallback(async (id: string, params: any) => {
        const result = await appointmentService.cancel(id, params);
        
        // 🚀 Invalida caches relacionados
        invalidateCache('dashboard');
        invalidateCache('doctorStats');
        
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
            pollAppointmentStatus, // 🚀 V2: Polling para atualização async
            cancelAppointment,
            getAvailableSlots,
            refreshAppointments
        }}>
            {children}
        </AppointmentsContext.Provider>
    );
};

export const useAppointmentsContext = () => useContext(AppointmentsContext);
