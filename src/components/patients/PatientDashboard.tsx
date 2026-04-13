import { Activity, Calendar, ChevronDown, FileText, Plus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from 'react-router-dom';
import { extractErrorMessage } from '../../utils/errorUtils';
import { toDateString } from '../../utils/dateUtils';
import { useAppointments } from '../../hooks/useAppointments';
import { usePatients } from '../../hooks/usePatients';
import { CreateAppointmentParams } from '../../services/appointmentService';
import { createEvaluation, deleteEvaluation, getEvaluationsByPatient, updateEvaluation } from '../../services/evaluationService';
import patientService from '../../services/patientService';
import doctorService from '../../services/doctorService';
import { bookingService } from '../../services/bookingService';
import { IAppointment, IDoctors, IPatient } from '../../utils/types/types';
import PatientHeader from '../admin/PatientHeader';
import AppointmentHistoryModal from '../AppointmentHistoryModal';
import ScheduleModal from '../AppointmentPage';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { FutureSessionsCard } from './FutureSessionsCard';
import { PatientAvailablesCard } from './PatientAvailablesCard';
import PatientEvolution from './PatientEvolution';
import { PatientMiniCalendar } from './PatientMiniCalendar';
import TherapyPackagesSummary from './TherapyPackagesSummary';
import PatientInsuranceTab from '../patient/tabs/PatientInsuranceTab';

const initialPatientState: IPatient = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  profession: '',
  placeOfBirth: '',
  address: {
    street: '',
    number: '',
    district: '',
    city: '',
    state: '',
    zipCode: ''
  },
  phone: '',
  email: '',
  cpf: '',
  rg: '',
  specialties: [],
  mainComplaint: '',
  clinicalHistory: '',
  medications: '',
  allergies: '',
  familyHistory: '',
  healthPlan: {
    name: '',
    policyNumber: ''
  },
  legalGuardian: '',
  emergencyContact: {
    name: '',
    phone: '',
    relationship: ''
  },
  appointments: [],
  imageAuthorization: false
};

export default function PatientDashboard() {
  const { id: patientId } = useParams();
  const [showAppointments, setShowAppointments] = useState(false);
  const [showPrescriptions, setShowPrescriptions] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isEditing, setIsEditing] = useState(false);
  const [patientInfo, setPatientInfo] = useState<IPatient>(initialPatientState);
  const [editedInfo, setEditedInfo] = useState(null);
  const [doctors, setDoctors] = useState<IDoctors[]>([]);
  const [appointmentData, setAppointmentData] = useState({
    doctorId: '',
    date: '',
    time: '',
    reason: ''
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  //const [appointments, setAppointments] = useState<ScheduleAppointment[]>([]);
  const [careTeam, setCareTeam] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [evolutions, setEvolutions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [allAppointmentsById, setAllAppointmentsById] = useState([]);
  const [evaluationToEdit, setEvaluationToEdit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openSchedule, setOpenSchedule] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    date: '',
    time: '',
    reason: '',
    status: 'agendado'
  });
  const navigate = useNavigate();

  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [patientAppointments, setPatientAppointments] = useState<IAppointment[]>([]);

  // 🎯 USA O CONTEXTO GLOBAL DE PACIENTES
  const { patients } = usePatients();

  const {
    appointments,
    loading: appointmentsLoading,
    fetchAppointments,
    fetchAppointmentsByPatient,
    createAppointment,
    getAvailableSlots,
    pollingState
  } = useAppointments();

  // 🚀 V2: Busca agendamentos específicos do paciente (Event-Driven)
  useEffect(() => {
    if (patientId) {
      const loadAppointments = async () => {
        try {
          setIsLoading(true);
          const data = await fetchAppointmentsByPatient(patientId);
          setPatientAppointments(data || []);
          setAllAppointmentsById(data || []);
        } catch (err) {
          console.error('Erro ao buscar agendamentos:', err);
          toast.error('Erro ao carregar agendamentos do paciente');
        } finally {
          setIsLoading(false);
        }
      };

      loadAppointments();
    }
  }, [patientId, fetchAppointmentsByPatient]);
  const handleNewAppointment = async (appointmentData: IAppointment) => {
    try {
      const payload: CreateAppointmentParams = {
        patientId: appointmentData.patientId,
        doctorId: appointmentData.doctorId,
        date: appointmentData.date,
        time: appointmentData.time,
        reason: appointmentData.reason,
        specialty: appointmentData.sessionType,
        clinicalStatus: 'pending',
        operationalStatus: 'scheduled'
      };

      await createAppointment(payload);
      toast.success('Agendamento criado com sucesso!');
      fetchAppointments();

      setOpenSchedule(false);

    } catch (error) {
      toast.error(extractErrorMessage(error, 'Erro ao criar agendamento'));
      console.error(error);
    }
  };

  useEffect(() => {
  }, [appointments]);

  useEffect(() => {
    if (patients.length > 0 && patientId) {
      const patient = patients.find(p => p._id === patientId);
      if (patient) {
        setPatientInfo(patient);
      }
    }
  }, [patients, patientId]);


  // 🚀 V2: Busca perfil do paciente (CQRS - PatientsView)
  const fetchPatientProfile = async () => {
    try {
      if (!patientId) {
        navigate('/login');
        return;
      }

      // Usa V2 para leitura rápida via PatientsView (10-50ms)
      const patient = await patientService.getById(patientId);
      setPatientInfo(patient);
      setEditedInfo(patient);
    } catch (error: any) {
      console.error('Erro ao buscar dados do paciente:', error);
      
      // 🆕 Se paciente não encontrado (404), redireciona para lista
      if (error.response?.status === 404) {
        toast.error('Paciente não encontrado. Redirecionando...');
        navigate('/admin');
        return;
      }
      
      toast.error('Erro ao carregar dados do paciente');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  // 🚀 V2: Busca lista de médicos
  const fetchDoctors = async () => {
    try {
      const response = await doctorService.getAllDoctors();
      setDoctors(response.data || []);
    } catch (error: any) {
      console.error('Error fetching doctors:', error);
      toast.error('Erro ao carregar médicos');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handlePayloadToSlots = async (data: { doctorId: string; date: string }) => {
    setFormData(prev => ({ ...prev, ...data }));
    if (data.doctorId && data.date) {
      const slots = await handleFetchAvailableSlots(data);
      setAvailableSlots(slots);
    }
  };

  const handleFetchAvailableSlots = async (payload: AvailableSlotsParams): Promise<string[]> => {
    try {

      const slots = await getAvailableSlots(payload);
      return slots;
    } catch (error) {
      toast.error('Erro ao buscar horários disponíveis');
      console.error(error);
      return [];
    }
  };
  // Data de hoje no formato YYYY-MM-DD
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Filtra apenas os agendamentos DESSE paciente que são para hoje
  const todaysAppointments = patientAppointments?.filter((appt) => {
    if (!appt.date) return false;
    // 🆕 Usa helper para compatibilidade com Date e string
    return toDateString(appt.date) === todayStr;
  }) || [];

  // 🚀 V2: Busca horários disponíveis via hook useAppointments
  const fetchAvailableSlots = async (doctorId: string, date: string) => {
    if (!doctorId || !date) return;
    try {
      const slots = await getAvailableSlots({ doctorId, date });
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast.error('Erro ao buscar horários disponíveis');
    }
  };

  /*   const fetchAppointments = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/appointments/patient/${patientId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setAppointments(data);
        }
      } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
      }
    }; */


  const handleOpenHistory = () => {
    setShowHistory(true);
  };

  // Agora usamos patientAppointments diretamente para o card de atividades
  const recentActivities = patientAppointments.filter(appt =>
    appt.operationalStatus === 'completed' ||
    appt.operationalStatus === 'cancelled' ||
    appt.operationalStatus === 'confirmed'
  );


  const fetchCareTeam = async () => {
    /* try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch(BASE_URL + '/patient/care-team', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCareTeam(data);
      } else {
        console.error('Failed to fetch care team');
      }
    } catch (error) {
      console.error('Error fetching care team:', error);
    } */
  };

  const fetchPrescriptions = async () => {
    /* try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch(BASE_URL + '/patient/prescriptions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data);
      } else {
        console.error('Failed to fetch prescriptions');
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } */
  };

  // 🚀 V2: Busca evoluções usando evaluationService
  useEffect(() => {
    if (activeTab === 'Evolution' && patientInfo?._id) {
      const fetchEvolutions = async () => {
        try {
          const data = await getEvaluationsByPatient(patientInfo._id);
          setEvolutions(data || []);
        } catch (error) {
          console.error('Erro ao carregar evoluções:', error);
          toast.error('Erro ao carregar dados de evolução');
        }
      };

      fetchEvolutions();
    }
  }, [activeTab, patientInfo]);

  const [evaluations, setEvaluations] = useState([]);

  useEffect(() => {

    fetchEvaluations();
  }, [patientInfo]);

  const handleEvaluationSubmit = async (data: any, id?: string) => {
    try {
      if (id) {
        await updateEvaluation(id, data);
        toast.success("Avaliação atualizada com sucesso!");
      } else {
        await createEvaluation({ ...data, patientId: patientInfo._id });
        toast.success("Avaliação criada com sucesso!");
      }

      const updated = await getEvaluationsByPatient(patientInfo._id);
      setEvaluations(updated);
    } catch (error) {
      toast.error("Erro ao salvar avaliação.");
      console.error("Erro:", error);
    }
  };


  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta avaliação?")) {
      try {
        await deleteEvaluation(`${id}`);
        toast.success("Avaliação excluída com sucesso!");
        fetchEvaluations();
      } catch (err) {
        toast.error("Erro ao excluir avaliação.");
      }
    }
  };

  const fetchEvaluations = async () => {
    try {
      if (patientInfo?._id) {
        const data = await getEvaluationsByPatient(patientInfo._id);
        setEvaluations(data);
      }
    } catch (error) {
      console.error("Erro ao buscar avaliações:", error);
    }
  };

  useEffect(() => {
    fetchPatientProfile();
    fetchDoctors();
    fetchCareTeam();
    fetchPrescriptions();
  }, [patientId]);

  /* const submitEvaluation = async (data: EvaluationData, id?: string) => {
    try {
      if (id) {
        await axios.put(`/api/evolutions/${id}`, data);
        toast.success('Avaliação atualizada!');
      } else {
        await axios.post('/api/evaluations/availables', {
          ...data,
          patientId,
          type: 'avaliação',
        });
        toast.success('Avaliação criada!');
      }
      fetchEvaluations();
    } catch (err) {
      toast.error('Erro ao salvar avaliação.');
    }
  }; */


  /* const handleEvaluationSubmit = async (formData: any) => {
    const token = localStorage.getItem("token");
  
    if (!patientInfo?._id || !token) {
      toast.error("Paciente ou token não encontrado.");
      return;
    }
  
    const result = await createEvaluation(
      {
        patientId: patientInfo._id,
        doctorId: formData.doctorId,
        sessionType: formData.sessionType,
        paymentType: formData.paymentType,
        date: formData.date,
        time: formData.time,
      },
    );
  
    if (result.success) {
      toast.success("Avaliação criada com sucesso!");
    }
  }; */
  {/* Componente auxiliar para formatar histórico */ }
  /*  function formatHistory(historyItem) {
     const date = new Date(historyItem.timestamp).toLocaleString('pt-BR')
     return `${historyItem.action} em ${date}`
   } */
  const handleOpenSchedule = (appointment: IAppointment | null = null, modeType: 'create' | 'edit' = 'create') => {
    setAppointmentData(appointment);
    setMode('edit');
    setOpenSchedule(true);
  };

  const renderDashboard = () => (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Card Agendamentos para Hoje */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Agendamentos para Hoje</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date().toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {todaysAppointments.length > 0 ? (
              todaysAppointments.map((appointment) => (
                <div key={appointment._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Avatar com inicial do profissional */}
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                      {appointment.doctor?.fullName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          Dr. {appointment.doctor?.fullName || 'Profissional'}
                        </h4>
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {appointment.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${appointment.operationalStatus === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : appointment.operationalStatus === 'canceled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                          {appointment.operationalStatus}
                        </span>
                        <span className="text-xs text-gray-500">
                          {appointment.duration} min
                        </span>
                      </div>
                      {appointment.notes && (
                        <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                          {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">Nenhum agendamento hoje</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Não há consultas agendadas para hoje. Agende uma nova consulta para começar.
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleOpenHistory}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Ver histórico completo →
            </button>
          </div>
        </div>

        {/* Card Atividades Recentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-50 rounded-lg">
                <Activity className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Atividades Recentes</h3>
                <p className="text-xs text-gray-500 mt-0.5">Histórico das últimas consultas</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {recentActivities.slice(0, 3).map((appointment) => (
              <div key={appointment._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">
                        {appointment.operationalStatus === 'confirmed' ? 'Consulta realizada' : 'Consulta cancelada'}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {new Date(appointment.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                        {appointment.doctor?.fullName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700">
                          Dr. {appointment.doctor?.fullName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {appointment.time} • {appointment.duration} min
                        </p>
                      </div>
                    </div>
                    {appointment.history?.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Última ação:</span> {appointment.history[0].action}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(appointment.history[0].timestamp).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="p-8 text-center">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Activity className="h-6 w-6 text-gray-400" />
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">Nenhuma atividade recente</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Suas consultas realizadas aparecerão aqui.
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex justify-end">
            <button className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors">
              Ver todas as atividades →
            </button>
          </div>
        </div>
      </div>

      {/* O restante do conteúdo permanece igual */}
      {patientInfo?._id && <FutureSessionsCard patientId={patientInfo._id} />}
      <div className="grid grid-cols-1 md:grid-cols-1 mb-5 gap-6">
        <PatientAvailablesCard
          doctors={doctors}
          evaluations={evaluations}
          patientInfo={patientInfo}
          evaluationToEdit={evaluationToEdit}
          setEvaluationToEdit={setEvaluationToEdit}
          onSubmit={handleEvaluationSubmit}
          onDelete={handleDelete}
        />
      </div>

      <Card>
        <CardHeader icon={FileText}>
          <CardTitle className="text-sm font-medium">Prescrições</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{prescriptions.length}</div>
          <p className="text-xs text-gray-500">Prescrições Ativa</p>
        </CardContent>
        <CardFooter className="p-2">
          <Button
            variant="ghost"
            className="w-full text-sm text-gray-500 hover:text-gray-900 transition-colors"
            onClick={() => setShowPrescriptions(!showPrescriptions)}
          >
            {showPrescriptions ? "Hide" : "Ver Todas"} Prescrições
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showPrescriptions ? "rotate-180" : ""}`} />
          </Button>
        </CardFooter>

        {showPrescriptions && (
          <div className="px-4 pb-4">
            {prescriptions.map((prescription, index) => (
              <div key={index} className="py-2 border-t">
                <p className="text-sm font-medium">{prescription.medication}</p>
                <p className="text-xs text-gray-500">
                  {prescription.dosage} - {prescription.frequency} - {" (Till - "}{new Date(prescription.tilldate).toLocaleDateString()}{") "}
                </p>
                <p className="text-xs text-gray-500">
                  Prescrito por: Dr. {prescription.doctorId?.fullName}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Equipe de cuidado</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {careTeam.map((member, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>Dr. {member.fullName} - {member.specialty}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <AppointmentHistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        appointments={allAppointmentsById}
      />
    </>
  );


  const renderEvolution = () => {
    if (!patientInfo) return null;

    return (
      <PatientEvolution
        patientId={patientInfo._id}
        patientName={patientInfo.fullName}
      />
    );
  };

  const renderManagePackages = () => {
    if (!patientInfo) return null;

    return (
      <TherapyPackagesSummary patient={patientInfo} doctors={doctors} />
    );
  };

  const renderAppointmentBooking = () => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setAppointmentData(prev => ({ ...prev, [name]: value }));

      if (name === 'date' || name === 'doctorId') {
        const currentDoctorId = name === 'doctorId' ? value : appointmentData.doctorId;
        const currentDate = name === 'date' ? value : appointmentData.date;
        if (currentDoctorId && currentDate) {
          fetchAvailableSlots(currentDoctorId, currentDate);
        }
      }
    };

    // 🚀 V2: Cria agendamento via BookingService Event-Driven
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!patientId) return;

      try {
        await bookingService.bookAppointment(
          {
            patientId: patientId,
            doctorId: appointmentData.doctorId,
            date: appointmentData.date,
            time: appointmentData.time,
            reason: appointmentData.reason,
            specialty: 'avaliação'
          },
          {
            onProgress: (status, progress) => {
              console.log(`[Booking] Status: ${status}, Progress: ${progress}%`);
            },
            onSuccess: () => {
              toast.success('Agendamento criado com sucesso!');
              setAppointmentData({
                doctorId: '',
                date: '',
                time: '',
                reason: ''
              });
              setAvailableSlots([]);
              // Recarrega agendamentos do paciente
              fetchAppointmentsByPatient(patientId).then(data => {
                setPatientAppointments(data || []);
                setAllAppointmentsById(data || []);
              });
            },
            onError: (error) => {
              toast.error(`Erro ao criar agendamento: ${error}`);
            }
          }
        );
      } catch (error: any) {
        console.error('Error booking appointment:', error);
        toast.error('Erro ao criar agendamento. Tente novamente.');
      }
    };

    return (
      <div>
        {appointments && (
          <PatientMiniCalendar appointments={allAppointmentsById} />
        )
        }
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <PatientHeader
        activeTab={activeTab}
        patientInfo={patientInfo}
        handleTabChange={setActiveTab}
        onNewAppointment={() => setOpenSchedule(true)}
        onLogout={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("userData");
          navigate("/login");
        }}
      />


      <main className="w-full mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* 🔹 Cabeçalho institucional */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Calendar size={26} style={{ color: '#00C087' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {patientInfo?.fullName || 'Paciente'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Gerencie avaliações, agendamentos e histórico do paciente.
              </p>
            </div>
          </div>

          {/*  <button
            onClick={() => handleOpenSchedule(null, 'create')}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, rgb(55,171,135), rgb(40,130,100))',
              fontWeight: 600,
            }}
            onMouseEnter={(e) =>
            (e.currentTarget.style.background =
              'linear-gradient(135deg, rgb(60,180,140), rgb(35,115,90))')
            }
            onMouseLeave={(e) =>
            (e.currentTarget.style.background =
              'linear-gradient(135deg, rgb(55,171,135), rgb(40,130,100))')
            }
          >
            <Plus size={18} />
            Novo Agendamento
          </button> */}
        </div>


        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {activeTab === 'Dashboard'}
            {activeTab === 'Profile'}
            {activeTab === 'Appointment Booking'}
            {activeTab === 'Management Packages'}
            {activeTab === 'Evolution'}
          </h2>
          
          {/* 🚀 V2: Indicador de processamento assíncrono */}
          {pollingState.isPolling && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Processando... ({pollingState.progress}%)</span>
            </div>
          )}
          
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              <span>Carregando...</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'Dashboard' && renderDashboard()}
          {activeTab === 'Appointment Booking' && renderAppointmentBooking()}
          {activeTab === 'Management Packages' && renderManagePackages()}
          {activeTab === 'Insurance Guides' && (patientInfo?.patientId || patientId) && <PatientInsuranceTab patientId={patientInfo?.patientId || patientId} />}
          {activeTab === 'Evolution' && renderEvolution()}
        </div>
      </main>

      <ScheduleModal
        open={openSchedule}
        onClose={() => setOpenSchedule(false)}
        onSave={handleNewAppointment}
        patients={patients}
        doctors={doctors}
        initialData={appointmentData}
        payloadToSlots={handlePayloadToSlots}
        availableSlots={availableSlots}
        mode={mode}
      />
    </div>
  );
}