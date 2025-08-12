import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import API from '../services/api';
import {
    fetchFutureAppointments,
    fetchPatients,
    fetchStats,
    fetchTherapySessions,
    fetchTodaysAppointments,
    updateClinicalStatus
} from '../services/doctorService';
import { Appointment } from '../utils/types';
import { IPatient } from '../utils/types/types';

export default function useDoctorDashboard() {
  const [loading, setLoading] = useState(true);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [therapySessions, setTherapySessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    today: 0,
    confirmed: 0,
    totalPatients: 0,
    specialties: {}
  });
  const [futureAppointments, setFutureAppointments] = useState<Appointment[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [doctorRes, patientsRes, appointmentsRes, sessionsRes, statsRes] = await Promise.all([
        API.get('/users/me'),
        fetchPatients(),
        fetchTodaysAppointments(),
        fetchTherapySessions(),
        fetchStats()
      ]);

      setDoctorData(doctorRes.data);
      setPatients(patientsRes);
      setAppointments(appointmentsRes);
      setTherapySessions(sessionsRes);
      setStats(statsRes);
      
      const futureApps = await fetchFutureAppointments();
      setFutureAppointments(futureApps);
    } catch (error) {
      toast.error('Erro ao carregar dados do dashboard');
      console.error('Erro no dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCompleteSession = async (sessionId: string) => {
    try {
      await API.patch(`/doctors/therapy-sessions/${sessionId}/complete`);
      toast.success('Sessão marcada como concluída!');

      const updatedSessions = therapySessions.map(session =>
        session._id === sessionId ? { ...session, status: 'concluído' } : session
      );

      setTherapySessions(updatedSessions);
      const newStats = await fetchStats();
      setStats(newStats);
    } catch (error) {
      toast.error('Erro ao atualizar a sessão');
    }
  };

  const handleUpdateStatus = async (appointmentId: string, status: string) => {
    try {
      await updateClinicalStatus({ appointmentId, status });
      const response = await fetchTodaysAppointments();
      setAppointments(response);
      const newStats = await fetchStats();
      setStats(newStats);
    } catch (error) {
      toast.error('Erro ao atualizar status');
      console.error('Erro ao atualizar status:', error);
    }
  };

  return {
    loading,
    doctorData,
    patients,
    appointments,
    therapySessions,
    stats,
    futureAppointments,
    handleCompleteSession,
    handleUpdateStatus,
    refreshData: loadData
  };
}