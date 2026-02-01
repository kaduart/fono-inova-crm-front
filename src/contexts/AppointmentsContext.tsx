import React, { createContext, useCallback, useContext, useState } from 'react';
import { appointmentService, PaginationParams } from '../services/appointmentService';
import { IAppointment } from '../utils/types/types';

interface AppointmentsContextData {
    appointments: IAppointment[];
    fetchAppointments: (filters?: { startDate?: string; endDate?: string }) => Promise<void>;
    createAppointment: (data: any) => Promise<any>;
    updateAppointment: (id: string, data: any) => Promise<any>;
    completeAppointment: (id: string) => Promise<any>;
    cancelAppointment: (id: string, params: any) => Promise<any>;
    getAvailableSlots: (params: any) => Promise<string[]>;
}

const AppointmentsContext = createContext<AppointmentsContextData>({} as AppointmentsContextData);

export const AppointmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [appointments, setAppointments] = useState<IAppointment[]>([]);

    // ✅ FIX: usando appointmentService.list() corretamente
    const fetchAppointments = useCallback(async (filters?: { startDate?: string; endDate?: string }) => {
        try {
            console.log('📋 AppointmentsContext: Buscando appointments com filtros:', filters);

            const params: PaginationParams = {
                limit: 500,
                ...(filters?.startDate && { startDate: filters.startDate }),
                ...(filters?.endDate && { endDate: filters.endDate }),
            };

            console.log('📋 AppointmentsContext: Params para API:', params);

            const response = await appointmentService.list(params);
            
            console.log('📋 RAW RESPONSE:', response);
            console.log('📋 response.data:', response.data);
            const appointmentsData = Array.isArray(response.data) ? response.data : (response.data?.data || response.data || []);
            console.log('📋 AppointmentsContext: Appointments recebidos:', appointmentsData.length);
            
            setAppointments(appointmentsData);
        } catch (error) {
            console.error('❌ Erro ao buscar appointments:', error);
        }
    }, []);

    const createAppointment = useCallback(async (data: any) => {
        const result = await appointmentService.create(data);
        return result;
    }, []);

    const updateAppointment = useCallback(async (id: string, data: any) => {
        const result = await appointmentService.update(id, data);
        return result;
    }, []);

    const completeAppointment = useCallback(async (id: string) => {
        const result = await appointmentService.complete(id);
        return result;
    }, []);

    const cancelAppointment = useCallback(async (id: string, params: any) => {
        const result = await appointmentService.cancel(id, params);
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
            getAvailableSlots
        }}>
            {children}
        </AppointmentsContext.Provider>
    );
};

export const useAppointmentsContext = () => useContext(AppointmentsContext);