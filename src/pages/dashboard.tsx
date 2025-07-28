// src/pages/doctor/DashboardPage.tsx
import {
  BarChart,
  Calendar,
  ChevronDown,
  FileText,
  Stethoscope,
  User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AppointmentList from '../components/appointments/AppointmentList';
import AppointmentsSection from '../components/doctor/AppointmentsSection';
import DashboardStats from '../components/doctor/DashboardStats';
import PatientEvolutionPage from '../components/evolution/PatientEvolutionPage';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import API from '../services/api';
import { fetchFutureAppointments, fetchPatients, fetchStats, fetchTherapySessions, fetchTodaysAppointments, updateClinicalStatus } from '../services/doctorService';
import { Appointment } from '../utils/types';
import { IPatient } from '../utils/types/types';
import SpecialtyCard from './SpecialtyCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
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
  const [showTodayAppointments, setShowTodayAppointments] = useState(false);
  const [futureAppointments, setFutureAppointments] = useState<Appointment[]>([]);
  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true);
        const appointments = await fetchFutureAppointments();
        setFutureAppointments(appointments);
      } catch (error) {
        console.error('Failed to load appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);
  useEffect(() => {
    const fetchData = async () => {
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
        setLoading(false);
      } catch (error) {
        toast.error('Erro ao carregar dados do dashboard');
        console.error('Erro no dashboard:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCompleteSession = async (sessionId: string) => {
    try {
      await API.patch(`/doctor/therapy-sessions/${sessionId}/complete`);
      toast.success('Sessão marcada como concluída!');

      const updatedSessions = therapySessions.map(session =>
        session._id === sessionId ? { ...session, status: 'concluído' } : session
      );

      setTherapySessions(updatedSessions);

      // Atualizar estatísticas
      const newStats = await fetchStats();
      setStats(newStats);
    } catch (error) {
      toast.error('Erro ao atualizar a sessão');
    }
  };

  const handleUpdateStatus = async (appointmentId: string, status: string) => {
    try {
      await updateClinicalStatus({ appointmentId, status }); // Chame a função de atualização do status clínico aquiappointmentId}/status`, { status });

      const response = await fetchTodaysAppointments();

      // Atualização otimista
      setAppointments(response);

      // Atualizar estatísticas
      const newStats = await fetchStats();
      setStats(newStats);
    } catch (error) {
      toast.error('Erro ao atualizar status');
      console.error('Erro ao atualizar status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bem-vindo, Dr(a). {doctorData?.fullName}</h1>
        <p className="text-gray-600 mt-2">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 gap-2 w-full">
          <TabsTrigger value="overview" className="flex items-center justify-center gap-2">
            <BarChart size={16} />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center justify-center gap-2">
            <User size={16} />
            Pacientes
          </TabsTrigger>
          <TabsTrigger value="therapy" className="flex items-center justify-center gap-2">
            <Stethoscope size={16} />
            Evolução
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center justify-center gap-2">
            <Calendar size={16} />
            Agendamentos
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center justify-center gap-2">
            <FileText size={16} />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="therapy">
          <div className="mb-8">
            <PatientEvolutionPage patients={patients} patientId={patients[0]?._id} />
          </div>
        </TabsContent>
        {/* Visão Geral */}
        <TabsContent value="overview">
          <div className="mb-8">
            {stats && <DashboardStats stats={stats} />}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Agendamentos de Hoje</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setShowTodayAppointments(!showTodayAppointments)}
                  >
                    {showTodayAppointments ? 'Ocultar' : 'Ver todas'}
                    <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showTodayAppointments ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <AppointmentList
                  appointments={appointments}
                  onUpdateStatus={handleUpdateStatus}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  <span className="font-medium">Estatísticas da Especialidade</span>
                </div>
              </CardHeader>
              <CardContent>
                {doctorData && doctorData?.specialty && stats.specialty ? (
                  <SpecialtyCard
                    specialty={{
                      id: doctorData.specialty,
                      name: doctorData.specialty,
                      icon: doctorData.specialty === 'Fonoaudiologia' ? 'hearing' : 'brain',
                      color: doctorData.specialty === 'Fonoaudiologia' ? '#FF9800' : '#3B82F6',
                      sessionDuration: 40
                    }}
                    stats={{
                      scheduled: stats.specialties[doctorData.specialty].scheduled,
                      completed: stats.specialties[doctorData.specialty].completed,
                      canceled: stats.specialties[doctorData.specialty].canceled
                    }}
                  />
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Nenhuma estatística disponível para sua especialidade
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pacientes */}
        <TabsContent value="patients">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Gestão de Pacientes</h2>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diagnóstico</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Consulta</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Próxima Consulta</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {patients.map(patient => (
                      <tr key={patient._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{patient.fullName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {patient.diagnosis || 'Não informado'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {patient.lastAppointment
                            ? new Date(patient.lastAppointment).toLocaleDateString('pt-BR')
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {patient.nextAppointment
                            ? new Date(patient.nextAppointment).toLocaleDateString('pt-BR')
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button variant="outline" size="sm">
                            Detalhes
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evolução Terapêutica */}


        {/* Agendamentos */}
        <TabsContent value="appointments">
          <AppointmentsSection
            futureAppointments={futureAppointments}
            patients={patients}
            doctorData={doctorData}
            onUpdateStatus={handleUpdateStatus}
          // onNewAppointment={handleNewAppointment}
          />
        </TabsContent>

        {/* Relatórios */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios e Análises</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Progresso dos Pacientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500">Gráfico de progresso (em desenvolvimento)</span>
                    </div>
                    <p className="mt-4 text-sm text-gray-600">
                      Visualize o progresso terapêutico dos seus pacientes ao longo do tempo
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Frequência às Sessões</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500">Gráfico de frequência (em desenvolvimento)</span>
                    </div>
                    <p className="mt-4 text-sm text-gray-600">
                      Acompanhe a taxa de comparecimento dos seus pacientes
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Relatório Mensal
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}