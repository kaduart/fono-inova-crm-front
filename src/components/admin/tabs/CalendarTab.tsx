/**
 * CalendarTab - Integrado com Contextos Globais
 * 
 * Usa os contextos globais (Doctors, Patients, Appointments) para
 * sincronização automática entre todas as telas.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import EnhancedCalendar from '../../calendar/EnhancedCalendar';

import { usePatients } from '../../../hooks/usePatients';
import { useDoctorsContext } from '../../../contexts/DoctorsContext';
import { useAppointmentsContext } from '../../../contexts/AppointmentsContext';
import toast from 'react-hot-toast';
import moment from 'moment-timezone';

interface CalendarTabProps {
    onNewAppointment: (data: any) => Promise<void>;
    onCancelAppointment: (id: string, reason: string, paymentState?: { paymentMethod?: string; billingType?: string; sessionValue?: number }) => Promise<void>;
    onCompleteAppointment: (id: string, data?: { addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string }) => Promise<void>;
    onConfirmAppointment?: (id: string, notes?: string) => Promise<void>;
    onEditAppointment: (id: string, data: any) => Promise<void>;
    onFetchAvailableSlots: (payload: any) => Promise<string[]>;
}

export const CalendarTab = ({
    onNewAppointment,
    onCancelAppointment,
    onCompleteAppointment,
    onConfirmAppointment,
    onEditAppointment,
    onFetchAvailableSlots
}: CalendarTabProps) => {
    // 🎯 USA OS CONTEXTOS GLOBAIS
    const { activeDoctors: doctors, loading: doctorsLoading } = useDoctorsContext();
    const { patients, loading: patientsLoading } = usePatients();
    const { appointments, fetchAppointments } = useAppointmentsContext();
    
    const [appointmentsLoading, setAppointmentsLoading] = useState(true); // 🆕 NOVO: Loading de appointments
    const loading = patientsLoading || doctorsLoading || appointmentsLoading;
    const [closeModalSignal, setCloseModalSignal] = useState(0);
    
    // Range padrão: mês atual
    const [dateRange, setDateRange] = useState(() => {
        const start = moment().startOf('month').format('YYYY-MM-DD');
        const end = moment().endOf('month').format('YYYY-MM-DD');
        return { startDate: start, endDate: end };
    });
    const dateRangeRef = useRef(dateRange);
    useEffect(() => { dateRangeRef.current = dateRange; }, [dateRange]);

    // 🎯 Carrega agendamentos iniciais (pacientes e médicos vêm dos contextos)
    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            setAppointmentsLoading(true); // 🆕 INICIA LOADING
            try {
                // 🎯 Carrega appointments via contexto (sincronizado globalmente)
                if (mounted) {
                    await fetchAppointments({
                        startDate: dateRange.startDate,
                        endDate: dateRange.endDate,
                        excludePreAgendamentos: true
                    });
                }
            } catch (error) {
                console.error('Erro ao carregar calendário:', error);
                toast.error('Erro ao carregar calendário');
            } finally {
                if (mounted) {
                    setAppointmentsLoading(false); // 🆕 FINALIZA LOADING
                }
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, []); // Só executa no mount

    // 🔄 Recarrega quando mudar de mês
    const handleMonthChange = useCallback(async (startDate: Date, endDate: Date) => {
        const middleDate = new Date(startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2);
        const newRange = {
            startDate: moment(middleDate).startOf('month').format('YYYY-MM-DD'),
            endDate: moment(middleDate).endOf('month').format('YYYY-MM-DD')
        };

        // Ignora se o mês não mudou (evita segundo fetch no mount inicial do FullCalendar)
        if (newRange.startDate === dateRangeRef.current.startDate &&
            newRange.endDate === dateRangeRef.current.endDate) {
            return;
        }

        setAppointmentsLoading(true);
        setDateRange(newRange);

        try {
            await fetchAppointments({
                startDate: newRange.startDate,
                endDate: newRange.endDate,
                excludePreAgendamentos: true
            });
        } finally {
            setAppointmentsLoading(false);
        }
    }, [fetchAppointments]);

    const handleNewAppointment = async (data: any) => {
        await onNewAppointment(data);
        setCloseModalSignal(prev => prev + 1);
        
        // 🎯 Pacientes e Appointments já são atualizados via contexto
    };

    const handleCancelAppointment = async (id: string, reason: string, paymentState?: { paymentMethod?: string; billingType?: string; sessionValue?: number }) => {
        try {
            await onCancelAppointment(id, reason, paymentState);
            // 🎯 Só fecha o modal se não der erro
            setCloseModalSignal(prev => prev + 1);
        } catch (error) {
            // 🎯 Se der erro, NÃO fecha o modal - deixa o usuário ver o erro e tentar novamente
            console.error('[CalendarTab] Erro ao cancelar:', error);
            throw error; // Re-throw para o modal saber que deu erro
        }
    };

    const handleCompleteAppointment = async (id: string, data?: { addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string }) => {
        await onCompleteAppointment(id, data);
        setCloseModalSignal(prev => prev + 1);
        // 🎯 Força refresh para garantir atualização imediata na tela
        setTimeout(async () => {
            await fetchAppointments({
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                excludePreAgendamentos: true,
                force: true // 🆕 Ignora cache
            });
        }, 500); // Pequeno delay para o backend processar
    };

    const handleConfirmAppointment = async (id: string, notes?: string) => {
        if (!onConfirmAppointment) return;
        await onConfirmAppointment(id, notes);
        setCloseModalSignal(prev => prev + 1);
        // 🎯 Appointments já são atualizados via contexto
    };

    const handleEditAppointment = async (id: string, data: any) => {
        await onEditAppointment(id, data);
        setCloseModalSignal(prev => prev + 1);
        // 🎯 Appointments já são atualizados via contexto
    };

    return (
        <EnhancedCalendar
            doctors={doctors}
            patients={patients}
            appointments={appointments}
            onDateClick={() => {}}
            onNewAppointment={handleNewAppointment}
            onCancelAppointment={handleCancelAppointment}
            onCompleteAppointment={handleCompleteAppointment}
            onConfirmAppointment={handleConfirmAppointment}
            onEditAppointment={handleEditAppointment}
            onFetchAvailableSlots={onFetchAvailableSlots}
            onMonthChange={handleMonthChange}
            openModalAppointment={false}
            closeModalSignal={closeModalSignal}
            loading={loading}
        />
    );
};

export default CalendarTab;
