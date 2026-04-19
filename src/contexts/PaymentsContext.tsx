import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import API from '../services/api';
import { FinancialRecord } from '../services/paymentService';
import { socketManager } from '../utils/socketManager';

interface PaymentsStats {
    produced: number;
    received: number;
    pending: number;
    countPaid: number;
    countPartial: number;
    countPending: number;
    byMethod: {
        pix: number;
        card: number;
        cash: number;
        transfer: number;
        insurance: number;
        other: number;
    };
    byType: {
        particular: number;
        package: number;
        insurance: number;
        manual: number;
    };
}

interface PaymentsContextData {
    // Estado
    payments: FinancialRecord[];
    stats: PaymentsStats | null;
    isLoading: boolean;
    currentMonth: string | null;
    
    // Actions
    setPayments: (payments: FinancialRecord[]) => void;
    setStats: (stats: PaymentsStats) => void;
    loadPayments: (month: string) => Promise<void>;
    addPayment: (payment: FinancialRecord) => void;
    updatePayment: (updated: FinancialRecord) => void;
    removePayment: (id: string) => void;
    clearPayments: () => void;
}

const PaymentsContext = createContext<PaymentsContextData>({
    payments: [],
    stats: null,
    isLoading: false,
    currentMonth: null,
    setPayments: () => {},
    setStats: () => {},
    loadPayments: async () => {},
    addPayment: () => {},
    updatePayment: () => {},
    removePayment: () => {},
    clearPayments: () => {}
});

export const PaymentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [payments, setPaymentsState] = useState<FinancialRecord[]>([]);
    const [stats, setStats] = useState<PaymentsStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState<string | null>(null);
    
    // Ref para deduplicar pagamentos (evita duplicados no addPayment)
    const paymentsRef = useRef<Map<string, FinancialRecord>>(new Map());
    
    // 🛡️ PROTEÇÃO: Controle de concorrência (race condition ao trocar mês rápido)
    const requestIdRef = useRef(0);

    const setPayments = useCallback((newPayments: FinancialRecord[]) => {
        console.log('[PaymentsContext] setPayments chamado com', newPayments.length, 'registros');
        // Deduplica por _id
        const unique = new Map<string, FinancialRecord>();
        newPayments.forEach(p => unique.set(p._id, p));
        
        paymentsRef.current = unique;
        const uniqueArray = Array.from(unique.values());
        console.log('[PaymentsContext] Após deduplicação:', uniqueArray.length, 'registros');
        setPaymentsState(uniqueArray);
    }, []);

    // 🚀 LOAD COM CACHE POR MÊS + PROTEÇÃO DE CONCORRÊNCIA
    const loadPayments = useCallback(async (month: string) => {
        // ✅ Cache: se já carregou esse mês, não busca de novo
        if (currentMonth === month && payments.length > 0) {
            return;
        }

        // 🛡️ Incrementa request ID para esta chamada
        const currentRequest = ++requestIdRef.current;

        setIsLoading(true);
        try {
            // 🆕 NOVO ENDPOINT: Financial Overview (tudo em um só)
            const [year, monthNum] = month.split('-');
            const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
            
            // 🚀 Busca TODOS os appointments do período (V2 - otimizado)
            const queryParams = new URLSearchParams();
            queryParams.append('startDate', `${month}-01`);
            queryParams.append('endDate', `${month}-${lastDay}`);
            queryParams.append('limit', '500');
            queryParams.append('light', 'true');
            
            const res = await API.get(`/v2/appointments?${queryParams.toString()}`);
            
            // 🛡️ IGNORA resposta se já teve nova requisição (race condition)
            if (currentRequest !== requestIdRef.current) {
                console.log('[PaymentsContext] Resposta ignorada (request antigo)');
                return;
            }
            
            // 🆕 V2: Extrai appointments da estrutura correta
            // V2 retorna: { success: true, data: { appointments: [...], pagination: {...} } }
            const appointments = res.data?.data?.appointments || res.data?.appointments || res.data?.data || res.data || [];
            
            // Garante que é array
            if (!Array.isArray(appointments)) {
                console.error('[PaymentsContext] appointments não é array:', appointments);
                setPayments([]);
                return;
            }
            
            // 🎯 Converte appointments para FinancialRecord
            const mappedPayments: FinancialRecord[] = appointments.map((appt: any) => {
                const isPackageAppointment = !!(appt.package?._id || appt.package) || appt.serviceType === 'package_session';
                const hasPayment = !!(appt.payment?._id || appt.payment);
                const realPaymentId = appt.payment?._id?.toString?.() || appt.payment?.toString?.() || null;

                return {
                    _id: realPaymentId || appt.id || appt._id,
                    date: appt.date ? new Date(appt.date).toISOString().split('T')[0] : '',
                    description: appt.notes || '',
                    amount: appt.sessionValue || appt.insuranceValue || 0,
                    // 💰 Fonte de verdade: Payment.status
                    paid: appt.payment?.status === 'paid' || appt.payment?.status === 'package_paid',
                    status: appt.payment?.status || appt.paymentStatus || 'pending',
                    specialty: appt.specialty || '',
                    createdAt: appt.createdAt || '',
                    patientId: appt.patient?._id || '',
                    doctorId: appt.doctor?._id || '',
                    serviceType: appt.serviceType || 'session',
                    paymentMethod: appt.billingType === 'convenio' ? 'Convênio' : (appt.metadata?.paymentMethod || ''),
                    notes: appt.notes || '',
                    packageId: appt.package?._id || appt.package || '',
                    sessionId: appt.session?._id || appt.session || '',
                    advancedSessions: [],
                    patient: appt.patient
                        ? { _id: appt.patient._id, fullName: appt.patient.fullName || appt.patient.nome || appt.patient.name || '' }
                        : { _id: '', fullName: appt.patientName || 'Desconhecido' },
                    doctor: appt.doctor
                        ? { _id: appt.doctor._id, fullName: appt.doctor.fullName || appt.doctor.nome || appt.doctor.name || '' }
                        : { _id: '', fullName: appt.professionalName || '' },
                    appointment: { date: appt.date || '', time: appt.time || '', status: appt.operationalStatus || '' },
                    advanceSessions: [],
                    // 🚨 IMPORTANTE: Marca que veio de appointment (não é um payment real)
                    __isAppointmentRecord: true,
                    __appointmentId: appt.id || appt._id,
                    __hasPayment: hasPayment,
                    __realPaymentId: realPaymentId || undefined,
                    __isPackageAppointment: isPackageAppointment,
                };
            });

            // 🎯 Calcula stats
            const statsData: PaymentsStats = {
                produced: mappedPayments.filter(p => p.status !== 'canceled').reduce((sum, p) => sum + (p.amount || 0), 0),
                received: mappedPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0),
                pending: mappedPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0),
                countPaid: mappedPayments.filter(p => p.status === 'paid').length,
                countPartial: mappedPayments.filter(p => p.status === 'partial').length,
                countPending: mappedPayments.filter(p => p.status === 'pending').length,
                byMethod: { pix: 0, card: 0, cash: 0, transfer: 0, insurance: 0, other: 0 },
                byType: { particular: 0, package: 0, insurance: 0, manual: 0 },
            };

            setPayments(mappedPayments);
            setStats(statsData);
            setCurrentMonth(month);
        } catch (error) {
            console.error('[PaymentsContext] Erro ao carregar:', error);
            throw error;
        } finally {
            // 🛡️ Só desativa loading se for o request atual
            if (currentRequest === requestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [currentMonth, payments.length, setPayments]);

    const addPayment = useCallback((payment: FinancialRecord) => {
        if (paymentsRef.current.has(payment._id)) {
            return; // Já existe, ignora
        }
        
        paymentsRef.current.set(payment._id, payment);
        setPaymentsState(prev => [payment, ...prev]);
    }, []);

    const updatePayment = useCallback((updated: FinancialRecord) => {
        paymentsRef.current.set(updated._id, updated);
        
        setPaymentsState(prev => 
            prev.map(p => p._id === updated._id ? updated : p)
        );
    }, []);

    const removePayment = useCallback((id: string) => {
        paymentsRef.current.delete(id);
        setPaymentsState(prev => prev.filter(p => p._id !== id));
    }, []);

    const clearPayments = useCallback(() => {
        paymentsRef.current.clear();
        setPaymentsState([]);
        setStats(null);
        setCurrentMonth(null);
    }, []);

    // 🔄 Socket listeners para atualização em tempo real
    useEffect(() => {
        const handleAppointmentCompleted = (data: any) => {
            console.log('[PaymentsContext] Socket appointmentCompleted:', data);
            // 🔄 Atualiza se o mês atual for o do appointment
            if (currentMonth) {
                const today = new Date().toISOString().slice(0, 7);
                if (currentMonth === today) {
                    loadPayments(currentMonth);
                }
            }
        };

        const handleAppointmentUpdated = (data: any) => {
            console.log('[PaymentsContext] Socket appointmentUpdated:', data);
            // 🔄 Atualiza se o mês atual for o do appointment
            if (currentMonth) {
                const today = new Date().toISOString().slice(0, 7);
                if (currentMonth === today) {
                    loadPayments(currentMonth);
                }
            }
        };

        const unsubCompleted = socketManager.on('appointmentCompleted', handleAppointmentCompleted);
        const unsubUpdated = socketManager.on('appointmentUpdated', handleAppointmentUpdated);

        return () => {
            unsubCompleted();
            unsubUpdated();
        };
    }, [currentMonth, loadPayments]);

    return (
        <PaymentsContext.Provider
            value={{
                payments,
                stats,
                isLoading,
                currentMonth,
                setPayments,
                setStats,
                loadPayments,
                addPayment,
                updatePayment,
                removePayment,
                clearPayments
            }}
        >
            {children}
        </PaymentsContext.Provider>
    );
};

export const usePaymentsContext = () => {
    const context = useContext(PaymentsContext);
    if (!context) {
        throw new Error('usePaymentsContext deve ser usado dentro de PaymentsProvider');
    }
    return context;
};
