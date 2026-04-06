import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { appointmentService, PaginationParams } from '../services/appointmentService';
import { IAppointment } from '../utils/types/types';
import { socketManager } from '../utils/socketManager';
import { invalidateCache } from '../utils/cacheManager';

interface AppointmentsContextData {
    appointments: IAppointment[];
    isLoading: boolean;
    currentPeriod: { startDate?: string; endDate?: string } | null;
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
    const [isLoading, setIsLoading] = useState(false);
    const [currentFilters, setCurrentFilters] = useState<{ startDate?: string; endDate?: string }>({});
    const [currentPeriod, setCurrentPeriod] = useState<{ startDate?: string; endDate?: string } | null>(null);
    
    // Ref para debounce de socket events
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingRefreshRef = useRef(false);
    
    // 🛡️ PROTEÇÃO: Controle de concorrência (race condition ao trocar período rápido)
    const requestIdRef = useRef(0);
    
    // Ref para acesso síncrono aos filtros sem recriar callback
    const currentFiltersRef = useRef(currentFilters);
    const currentPeriodRef = useRef(currentPeriod);
    const appointmentsRef = useRef(appointments);
    const isFetchingRef = useRef(false);
    
    // Atualiza refs sem causar re-render
    currentFiltersRef.current = currentFilters;
    currentPeriodRef.current = currentPeriod;
    appointmentsRef.current = appointments;

    // 🚀 LOAD COM CACHE POR PERÍODO + PROTEÇÃO DE CONCORRÊNCIA
    const fetchAppointments = useCallback(async (filters?: { startDate?: string; endDate?: string }) => {
        // 🛡️ Proteção contra chamadas simultâneas
        if (isFetchingRef.current) {
            console.log('[AppointmentsContext] Já está carregando, ignorando chamada');
            return;
        }
        
        const effectiveFilters = filters || currentFiltersRef.current;

        // ✅ Persiste os filtros para que refreshAppointments reuse o range correto
        if (filters?.startDate) currentFiltersRef.current = filters;

        // ✅ Cache: se já carregou esse período, não busca de novo (null = forçar refresh)
        if (currentPeriodRef.current !== null &&
            currentPeriodRef.current?.startDate === effectiveFilters.startDate &&
            currentPeriodRef.current?.endDate === effectiveFilters.endDate &&
            appointmentsRef.current.length > 0) {
            return;
        }
        
        isFetchingRef.current = true;
        
        // 🛡️ Incrementa request ID para esta chamada
        const currentRequest = ++requestIdRef.current;
        
        setIsLoading(true);
        try {
            if (filters) {
                setCurrentFilters(filters);
            }
            
            // 🚀 V2: Usa listagem otimizada da V2 (light=true para calendário)
            const response = await appointmentService.listV2({
                limit: 500,
                light: true,  // 🆕 Apenas campos essenciais para o calendário
                ...(effectiveFilters?.startDate && { startDate: effectiveFilters.startDate }),
                ...(effectiveFilters?.endDate && { endDate: effectiveFilters.endDate }),
            });
            
            // 🛡️ IGNORA resposta se já teve nova requisição (race condition)
            if (currentRequest !== requestIdRef.current) {
                console.log('[AppointmentsContext] Resposta ignorada (request antigo)');
                return;
            }
            
            // 🆕 CORREÇÃO: Extrai appointments da estrutura correta da V2
            // V2 retorna: { success: true, data: { appointments: [...], pagination: {...} } }
            const appointmentsData = response.data?.data?.appointments || 
                                     response.data?.appointments || 
                                     response.data?.data || 
                                     response.data || 
                                     [];

            setAppointments(appointmentsData);
            setCurrentPeriod(effectiveFilters);
        } catch (error) {
            console.error('❌ Erro ao buscar appointments:', error);
        } finally {
            isFetchingRef.current = false;
            // 🛡️ Só desativa loading se for o request atual
            if (currentRequest === requestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, []);  // 🚀 Sem dependências - usa refs internamente

    const refreshAppointments = useCallback(async () => {
        console.log('🔄 [AppointmentsContext] Refreshing appointments...');
        // Limpa cache imediatamente via ref (setCurrentPeriod é async, não reflete antes do fetch)
        currentPeriodRef.current = null;
        setCurrentPeriod(null);
        await fetchAppointments(currentFiltersRef.current);
    }, [fetchAppointments]);

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
        
        // 🆕 V2: Eventos de completar/cancelar
        const unsubCompleted = socketManager.on('appointmentCompleted', handleSocketEvent('Agendamento completado'));
        const unsubCanceled = socketManager.on('appointmentCanceled', handleSocketEvent('Agendamento cancelado'));
        // Fallback para eventos genéricos
        const unsubGeneric = socketManager.on('appointment:refresh', handleSocketEvent('Refresh solicitado'));

        return () => {
            console.log('🔌 [AppointmentsContext] Removendo listeners de socket...');
            unsubCreated();
            unsubUpdated();
            unsubDeleted();
            unsubPreImported();
            unsubPreDiscarded();
            unsubCompleted();
            unsubCanceled();
            unsubGeneric();
        };
    }, [debouncedRefresh]);

    // 🚀 V2: Polling inteligente para aguardar processamento async
    const pollAppointmentStatus = useCallback(async (id: string, maxAttempts = 5): Promise<boolean> => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`[AppointmentsContext] Polling ${attempt}/${maxAttempts}...`);
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Usa endpoint leve /status — retorna isResolved diretamente
                const statusRes = await appointmentService.getStatus(id);
                const status = statusRes.data?.data;

                console.log('[POLL DEBUG] operationalStatus=', status?.operationalStatus, 'isResolved=', status?.isResolved);

                if (status?.isResolved) {
                    console.log('[AppointmentsContext] ✅ Agendamento processado!', status);

                    // Atualiza estado local com os campos de status disponíveis
                    setAppointments(prev =>
                        prev.map(a => (a._id === id ? {
                            ...a,
                            operationalStatus: status.operationalStatus,
                            clinicalStatus: status.clinicalStatus,
                            paymentStatus: status.paymentStatus,
                        } : a))
                    );

                    // Emite socket para atualizar outros componentes
                    socketManager.emit('appointmentUpdated', { appointmentId: id });

                    invalidateCache('dashboard');
                    invalidateCache('doctorStats');
                    return true;
                }
            } catch (err) {
                console.warn(`[AppointmentsContext] Polling ${attempt} falhou:`, err);
            }
        }
        console.warn('[AppointmentsContext] ❌ Polling expirou sem sucesso');
        return false;
    }, []);

    const createAppointment = useCallback(async (data: any) => {
        const result = await appointmentService.create(data);

        // 🚀 V2: Se for processamento async, inicia polling
        if (result?.data?.status?.startsWith('processing')) {
            console.log('[AppointmentsContext] V2: Agendamento em criação async, iniciando polling...');
            const appointmentId = result.data?.appointmentId;
            if (appointmentId) {
                pollAppointmentStatus(appointmentId, 10).then((done) => {
                    if (done) {
                        console.log('[AppointmentsContext] Agendamento criado via polling');
                        refreshAppointments();
                    }
                });
            }
            return { ...result, _isAsyncProcessing: true };
        }

        // Legado: Invalida caches e emite socket
        invalidateCache('dashboard');
        invalidateCache('doctorStats');
        socketManager.emit('appointmentCreated', { appointmentId: result?.data?._id || result?._id });
        return result;
    }, [pollAppointmentStatus, refreshAppointments]);

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

        // 🚀 V2: Se for processamento async, inicia polling
        if (result?.data?.status?.startsWith('processing')) {
            console.log('[AppointmentsContext] V2: Complete em processamento, iniciando polling...');
            pollAppointmentStatus(id, 10).then((done) => {
                if (done) {
                    console.log('[AppointmentsContext] ✅ Complete finalizado via polling');
                    // 🆕 EMITE SOCKET para atualizar calendário imediatamente
                    socketManager.emit('appointmentUpdated', { appointmentId: id });
                    refreshAppointments();
                } else {
                    console.warn('[AppointmentsContext] ⚠️ Polling falhou, fazendo refresh manual');
                    refreshAppointments();
                }
            });
            return { ...result, _isAsyncProcessing: true };
        }

        // Legado: Invalida caches e emite socket
        invalidateCache('dashboard');
        invalidateCache('doctorStats');
        socketManager.emit('appointmentUpdated', { appointmentId: id });
        return result;
    }, [pollAppointmentStatus, refreshAppointments]);

    const cancelAppointment = useCallback(async (id: string, params: any) => {
        const result = await appointmentService.cancel(id, params);

        // 🚀 V2: Se for processamento async, inicia polling
        if (result?.data?.status?.startsWith('processing')) {
            console.log('[AppointmentsContext] V2: Cancelamento em processamento, iniciando polling...');
            pollAppointmentStatus(id, 10).then((done) => {
                if (done) {
                    console.log('[AppointmentsContext] Cancelamento finalizado via polling');
                    refreshAppointments();
                }
            });
            return { ...result, _isAsyncProcessing: true };
        }
        
        // Legado: Invalida caches e emite socket
        invalidateCache('dashboard');
        invalidateCache('doctorStats');
        socketManager.emit('appointmentUpdated', { appointmentId: id });
        return result;
    }, [pollAppointmentStatus, refreshAppointments]);

    const getAvailableSlots = useCallback(async (params: any) => {
        const result = await appointmentService.getAvailableSlots(params);
        return result.data || [];
    }, []);

    return (
        <AppointmentsContext.Provider value={{
            appointments,
            isLoading,
            currentPeriod,
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
