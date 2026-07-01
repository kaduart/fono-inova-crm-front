/**
 * DoctorCalendarTab — Calendário do profissional usando EnhancedCalendar como engine compartilhada.
 *
 * NÃO duplica código do AppointmentsSection legado.
 * Usa EnhancedCalendar com mode="doctor" + capability gates.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import moment from 'moment-timezone';
import toast from 'react-hot-toast';
import EnhancedCalendar from '../../calendar/EnhancedCalendar';
import { useAppointmentsContext } from '../../../contexts/AppointmentsContext';
import { useDoctorsContext } from '../../../contexts/DoctorsContext';
import { usePatientsContext } from '../../../contexts/PatientsContext';
import {
  CalendarMode,
  getDefaultPermissions,
  getDefaultFeatureFlags,
} from '../../../types/calendarCapabilities';

interface DoctorCalendarTabProps {
  doctorId: string;
}

export const DoctorCalendarTab = ({ doctorId }: DoctorCalendarTabProps) => {
  const {
    appointments: allAppointments,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    completeAppointment,
    confirmAppointment,
    cancelAppointment,
    getAvailableSlots,
    isLoading: appointmentsLoading,
  } = useAppointmentsContext();

  const { activeDoctors: doctors, loading: doctorsLoading } = useDoctorsContext();
  const { patients, loading: patientsLoading } = usePatientsContext();

  const [closeModalSignal, setCloseModalSignal] = useState(0);
  const [localLoading, setLocalLoading] = useState(true);

  // Range padrão: mês atual
  const [dateRange, setDateRange] = useState(() => {
    const start = moment().startOf('month').format('YYYY-MM-DD');
    const end = moment().endOf('month').format('YYYY-MM-DD');
    return { startDate: start, endDate: end };
  });

  // 🎯 Filtra appointments pelo doctorId logado
  const doctorAppointments = useMemo(() => {
    if (!allAppointments || allAppointments.length === 0) return [];
    return allAppointments.filter((appt: any) => {
      const apptDoctorId =
        appt.doctor?._id || appt.doctor?.id || appt.doctorId || '';
      return apptDoctorId === doctorId;
    });
  }, [allAppointments, doctorId]);

  const loading = appointmentsLoading || doctorsLoading || patientsLoading || localLoading;

  // 🎯 Carrega agendamentos iniciais filtrados pelo profissional
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLocalLoading(true);
      try {
        if (mounted) {
          await fetchAppointments({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            doctorId,
          });
        }
      } catch (error) {
        console.error('[DoctorCalendarTab] Erro ao carregar calendário:', error);
        toast.error('Erro ao carregar calendário');
      } finally {
        if (mounted) {
          setLocalLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [doctorId]); // Só executa no mount ou quando doctorId muda

  // 🔄 Recarrega quando mudar de mês
  const handleMonthChange = useCallback(
    async (startDate: Date, endDate: Date) => {
      const middleDate = new Date(
        startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2
      );
      const newRange = {
        startDate: moment(middleDate).startOf('month').format('YYYY-MM-DD'),
        endDate: moment(middleDate).endOf('month').format('YYYY-MM-DD'),
      };

      setDateRange(newRange);
      setLocalLoading(true);

      try {
        await fetchAppointments({
          startDate: newRange.startDate,
          endDate: newRange.endDate,
          doctorId,
        });
      } finally {
        setLocalLoading(false);
      }
    },
    [fetchAppointments, doctorId]
  );

  const handleNewAppointment = async (data: any) => {
    await createAppointment(data);
    setCloseModalSignal((prev) => prev + 1);
  };

  const handleCancelAppointment = async (id: string, reason: string, paymentState?: { paymentMethod?: string; billingType?: string; sessionValue?: number }) => {
    try {
      await cancelAppointment(id, { reason, ...paymentState });
      setCloseModalSignal((prev) => prev + 1);
    } catch (error) {
      console.error('[DoctorCalendarTab] Erro ao cancelar:', error);
      throw error;
    }
  };

  const handleConfirmAppointment = async (id: string, notes?: string) => {
    await confirmAppointment(id, notes);
    setCloseModalSignal((prev) => prev + 1);
  };

  const handleCompleteAppointment = async (
    id: string,
    data?: { addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string }
  ) => {
    await completeAppointment(id, data);
    setCloseModalSignal((prev) => prev + 1);
    setTimeout(async () => {
      await fetchAppointments({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        doctorId,
        force: true,
      });
    }, 500);
  };

  const handleEditAppointment = async (id: string, data: any) => {
    await updateAppointment(id, data);
    setCloseModalSignal((prev) => prev + 1);
  };

  const handleFetchAvailableSlots = async (params: { doctorId: string; date: string }) => {
    return getAvailableSlots(params);
  };

  return (
    <EnhancedCalendar
      mode="doctor"
      permissions={getDefaultPermissions('doctor')}
      featureFlags={getDefaultFeatureFlags('doctor')}
      appointments={doctorAppointments}
      doctors={doctors}
      patients={patients}
      onDateClick={() => {}}
      onNewAppointment={handleNewAppointment}
      onCancelAppointment={handleCancelAppointment}
      onCompleteAppointment={handleCompleteAppointment}
      onConfirmAppointment={handleConfirmAppointment}
      onEditAppointment={handleEditAppointment}
      onFetchAvailableSlots={handleFetchAvailableSlots}
      onMonthChange={handleMonthChange}
      closeModalSignal={closeModalSignal}
      loading={loading}
    />
  );
};

export default DoctorCalendarTab;
