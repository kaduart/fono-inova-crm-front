/**
 * CalendarTab - Lazy Loading
 * 
 * Só carrega agendamentos quando a aba Calendário é ativada.
 * Usa range de datas do mês atual por padrão.
 */

import { useEffect, useState, useCallback } from 'react';
import EnhancedCalendar from '../../calendar/EnhancedCalendar';

import { appointmentService } from '../../../services/appointmentService';
import { patientService } from '../../../services/patientService';
import { doctorService } from '../../../services/doctorService';
import { Skeleton } from '@mui/material';
import toast from 'react-hot-toast';
import moment from 'moment-timezone';

interface Doctor {
    _id: string;
    fullName: string;
    specialty?: string;
}

interface Patient {
    _id: string;
    fullName: string;
}

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
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [closeModalSignal, setCloseModalSignal] = useState(0);
    
    // Range padrão: mês atual
    const [dateRange, setDateRange] = useState(() => {
        const start = moment().startOf('month').format('YYYY-MM-DD');
        const end = moment().endOf('month').format('YYYY-MM-DD');
        return { startDate: start, endDate: end };
    });

    // 🎯 Só carrega quando a aba é ativada
    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            const startTime = Date.now();
            try {
                setLoading(true);
                
                // Carrega dados dos pacientes e médicos
                const [patientsRes, doctorsRes] = await Promise.all([
                    patientService.fetchAll(false),
                    doctorService.getAllDoctors()
                ]);

                if (!mounted) return;

                setPatients(Array.isArray(patientsRes) ? patientsRes : []);
                setDoctors(doctorsRes.data || []);

                // Carrega appointments do mês
                const appointmentsRes = await appointmentService.list({
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate
                });

                if (!mounted) return;

                setAppointments(appointmentsRes.data || []);
            } catch (error) {
                console.error('Erro ao carregar calendário:', error);
                toast.error('Erro ao carregar calendário');
            } finally {
                // Garante tempo mínimo de loading para evitar flash (400ms)
                const elapsed = Date.now() - startTime;
                const minDelay = Math.max(0, 400 - elapsed);
                
                setTimeout(() => {
                    if (mounted) {
                        setLoading(false);
                    }
                }, minDelay);
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, []); // Só executa no mount

    // 🔄 Recarrega quando mudar de mês
    const handleMonthChange = useCallback((startDate: Date, endDate: Date) => {
        const formatDate = (date: Date): string => {
            return moment(date).format('YYYY-MM-DD');
        };

        const newRange = {
            startDate: formatDate(startDate),
            endDate: formatDate(endDate)
        };

        setDateRange(newRange);

        // Recarrega appointments com novo range
        appointmentService.list({
                    startDate: newRange.startDate,
                    endDate: newRange.endDate
                })
            .then(res => setAppointments(res.data || []))
            .catch(err => toast.error('Erro ao carregar agendamentos'));
    }, []);

    const handleNewAppointment = async (data: any) => {
        await onNewAppointment(data);
        setCloseModalSignal(prev => prev + 1);
        
        // 🔧 RECARREGA PACIENTES TAMBÉM (novo paciente pode ter sido criado)
        const [patientsRes, appointmentsRes] = await Promise.all([
            patientService.fetchAll(false),
            appointmentService.list({
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            })
        ]);
        
        setPatients(Array.isArray(patientsRes) ? patientsRes : []);
        setAppointments(appointmentsRes.data || []);
    };

    const handleCancelAppointment = async (id: string, reason: string) => {
        await onCancelAppointment(id, reason);
        setCloseModalSignal(prev => prev + 1);
        
        // Recarrega appointments
        const res = await appointmentService.list(dateRange);
        setAppointments(res.data || []);
    };

    const handleCompleteAppointment = async (id: string, data?: { addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string }) => {
        await onCompleteAppointment(id, data);
        setCloseModalSignal(prev => prev + 1);
        
        // Recarrega appointments
        const res = await appointmentService.list(dateRange);
        setAppointments(res.data || []);
    };

    const handleEditAppointment = async (id: string, data: any) => {
        await onEditAppointment(id, data);
        setCloseModalSignal(prev => prev + 1);
        
        // Recarrega appointments
        const res = await appointmentService.list(dateRange);
        setAppointments(res.data || []);
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
        />
    );
};

// Skeleton de loading
const CalendarSkeleton = () => (
    <div className="space-y-4">
        {/* Header do calendário */}
        <div className="flex justify-between items-center">
            <Skeleton variant="rectangular" width={200} height={40} />
            <div className="flex gap-2">
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="circular" width={40} height={40} />
            </div>
        </div>
        
        {/* Grid do calendário */}
        <Skeleton variant="rectangular" height={600} sx={{ borderRadius: 2 }} />
    </div>
);

export default CalendarTab;
