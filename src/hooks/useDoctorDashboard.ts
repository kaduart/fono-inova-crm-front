// src/hooks/useDoctorDashboard.ts
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import API from '../services/api';
import {
  doctorService,
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
  const [totalDoctors, setTotalDoctors] = useState<number>(0);
  const [doctorOverview, setDoctorOverview] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

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
      console.log('patientsRes:', patientsRes);
      setDoctorData(doctorRes.data);
      setPatients(patientsRes);
      setAppointments(appointmentsRes);
      setTherapySessions(sessionsRes);
      setStats(statsRes);

      if (doctorRes.data && doctorRes.data._id) {
        const calendarData = await doctorService.getAppointmentCalendarDoctor(doctorRes.data._id);
        console.log('calendarData:', calendarData);
        setCalendarEvents(calendarData);
      }
      const [futureApps, doctorsRes, totalDoctorsRes, doctorOverviewRes] = await Promise.all([
        fetchFutureAppointments(),
        doctorService.getAllDoctors(),
        doctorService.getTotalDoctors(),
        doctorService.getDoctorOverview()
      ]);
      setFutureAppointments(futureApps);
      setDoctors(doctorsRes.data);
      setTotalDoctors(totalDoctorsRes.totalDoctors);
      setDoctorOverview(doctorOverviewRes);

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
      const updated = await doctorService.completeTherapySession(sessionId);
      toast.success('Sessão marcada como concluída!');

      setTherapySessions((prev) =>
        prev.map((s) =>
          s._id === sessionId ? { ...s, status: "completed" } : s
        )
      );

      return updated;
    } catch (err) {
      console.error("Erro ao completar sessão:", err);
      throw err;
    }
  };

  const fetchDoctors = async () => {

    try {
      const response = await doctorService.getAllDoctors();
      setDoctors(response.data);
    } catch (error) {
      toast.error('Erro ao atualizar status');
      console.error('Erro ao atualizar status:', error);
    }
  };
  useEffect(() => {
    fetchDoctors();
  }, []);

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

  const createDoctor = async (doctor: any) => {
    setLoading(true);
    try {
      await doctorService.createDoctor(doctor);
      // atualiza a lista local
      const allDoctors = await doctorService.getAllDoctors();
      setDoctors(allDoctors.data);
    } catch (error: any) {
      console.error("Erro ao criar profissional:", error);
      toast.error(error.message || "Erro ao criar profissional");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateDoctor = async (doctor: any) => {
    if (!doctor._id) throw new Error("ID do profissional é obrigatório");
    setLoading(true);
    try {
      await doctorService.updateDoctor(doctor._id, doctor);
      const allDoctors = await doctorService.getAllDoctors();
      setDoctors(allDoctors.data);
    } catch (error: any) {
      console.error("Erro ao atualizar profissional:", error);
      toast.error(error.message || "Erro ao atualizar profissional");
      throw error;
    }
    finally {
      setLoading(false);
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

    // 🔥 novos retornos
    doctors,
    totalDoctors,
    doctorOverview,

    handleCompleteSession,
    handleUpdateStatus,
    refreshData: loadData,
    createDoctor,
    fetchPatients,
    calendarEvents,
    updateDoctor
  };
}
