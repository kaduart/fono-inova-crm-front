/**
 * CalendarTab - Integrado com Contextos Globais
 * 
 * Usa os contextos globais (Doctors, Patients, Appointments) para
 * sincronização automática entre todas as telas.
 */

import { useEffect, useState, useCallback } from 'react';
import EnhancedCalendar from '../../calendar/EnhancedCalendar';

import { usePatients } from '../../../hooks/usePatients';
import { useDoctorsContext } from '../../../contexts/DoctorsContext';
import { useAppointmentsContext } from '../../../contexts/AppointmentsContext';
import { Skeleton } from '@mui/material';
import toast from 'react-hot-toast';
import moment from 'moment-timezone';

interface CalendarTabProps {
    onNewAppointment: (data: any) => Promise<void>;
    onCancelAppointment: (id: string, reason: string) => Promise<void>;
    onCompleteAppointment: (id: string, data?: { addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string }) => Promise<void>;
    onEditAppointment: (id: string, data: any) => Promise<void>;
    onFetchAvailableSlots: (payload: any) => Promise<string[]>;
}

export const CalendarTab = ({
    onNewAppointment,
    onCancelAppointment,
    onCompleteAppointment,
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
        setAppointmentsLoading(true); // 🆕 INICIA LOADING
        
        const formatDate = (date: Date): string => {
            return moment(date).format('YYYY-MM-DD');
        };

        const newRange = {
            startDate: formatDate(startDate),
            endDate: formatDate(endDate)
        };

        setDateRange(newRange);

        try {
            // 🎯 Usa o contexto para buscar appointments
            await fetchAppointments({
                startDate: newRange.startDate,
                endDate: newRange.endDate,
                excludePreAgendamentos: true
            });
        } finally {
            setAppointmentsLoading(false); // 🆕 FINALIZA LOADING
        }
    }, [fetchAppointments]);

    const handleNewAppointment = async (data: any) => {
        await onNewAppointment(data);
        setCloseModalSignal(prev => prev + 1);
        
        // 🎯 Pacientes e Appointments já são atualizados via contexto
    };

    const handleCancelAppointment = async (id: string, reason: string) => {
        await onCancelAppointment(id, reason);
        setCloseModalSignal(prev => prev + 1);
        // 🎯 Appointments já são atualizados via contexto
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

    const handleEditAppointment = async (id: string, data: any) => {
        await onEditAppointment(id, data);
        setCloseModalSignal(prev => prev + 1);
        // 🎯 Appointments já são atualizados via contexto
    };

    if (loading) {
        return <CalendarSkeleton />;
    }

    return (
        <EnhancedCalendar
            doctors={doctors}
            patients={patients}
            appointments={appointments}
            onDateClick={() => {}}
            onNewAppointment={handleNewAppointment}
            onCancelAppointment={handleCancelAppointment}
            onCompleteAppointment={handleCompleteAppointment}
            onEditAppointment={handleEditAppointment}
            onFetchAvailableSlots={onFetchAvailableSlots}
            onMonthChange={handleMonthChange}
            openModalAppointment={false}
            closeModalSignal={closeModalSignal}
            loading={appointmentsLoading} // 🆕 NOVO: Passa o estado de loading
        />
    );
};

// Skeleton de loading
const CalendarSkeleton = () => (
    <div className="space-y-4">
        {/* Header do calendário */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center gap-4">
                <Skeleton variant="rectangular" width={40} height={40} className="rounded-lg" />
                <Skeleton variant="text" width={200} height={32} />
            </div>
            <div className="flex gap-2">
                <Skeleton variant="rectangular" width={100} height={36} className="rounded-lg" />
                <Skeleton variant="rectangular" width={120} height={36} className="rounded-lg" />
            </div>
        </div>

        {/* Grade do calendário */}
        <div className="bg-white rounded-lg shadow-sm p-4">
            {/* Header dos dias da semana */}
            <div className="grid grid-cols-7 gap-2 mb-4">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                    <div key={day} className="text-center py-2">
                        <Skeleton variant="text" width={40} height={24} className="mx-auto" />
                    </div>
                ))}
            </div>

            {/* Dias do calendário */}
            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, index) => (
                    <div key={index} className="aspect-square p-2 border rounded-lg">
                        <Skeleton variant="text" width={24} height={20} className="mb-2" />
                        <Skeleton variant="rectangular" width="100%" height={16} className="rounded" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default CalendarTab;
