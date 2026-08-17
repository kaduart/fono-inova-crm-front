import { Activity, Calendar, ChevronDown, CreditCard, FileText, HeartPulse, Phone, Plus, ShieldCheck, UserRound, Users } from 'lucide-react';
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
import { mapPatientResponseDTO } from '../../dtos/patient.response.dto';
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
import { PatientAppointmentsTable } from './PatientAppointmentsTable';
import PatientEvolution from './PatientEvolution';
import { PatientMiniCalendar } from './PatientMiniCalendar';
import TherapyPackagesSummary from './TherapyPackagesSummary';
import PatientInsuranceTab from '../patient/tabs/PatientInsuranceTab';
import { PatientBalanceModal } from './PatientBalanceModal';
import LiminarContractPanel from '../liminar/LiminarContractPanel';

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
  const [showHistory, setShowHistory] = useState(false);
  const [allAppointmentsById, setAllAppointmentsById] = useState([]);
  const [evaluationToEdit, setEvaluationToEdit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openSchedule, setOpenSchedule] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [liminarCreateTrigger, setLiminarCreateTrigger] = useState(0);

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

  const loadAllAppointments = async () => {
    if (!patientId) return;
    try {
      setIsLoading(true);
      // Busca única e completa — mês/dia/profissional/status são filtrados
      // no client (PatientAppointmentsTable), evitando refetch a cada troca de filtro
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

  // 🚀 V2: Busca agendamentos específicos do paciente (Event-Driven)
  useEffect(() => {
    loadAllAppointments();
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
      const patientDTO = mapPatientResponseDTO(patient);
      // Merge DTO com dados brutos para manter compatibilidade com IPatient
      setPatientInfo({ ...patient, ...patientDTO, _id: patientDTO.id, fullName: patientDTO.name });
      setEditedInfo({ ...patient, ...patientDTO, _id: patientDTO.id, fullName: patientDTO.name });
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
  const recentActivities = patientAppointments
    .filter(appt =>
      appt.operationalStatus === 'completed' ||
      appt.operationalStatus === 'canceled' ||
      appt.operationalStatus === 'missed' ||
      appt.operationalStatus === 'confirmed'
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


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
        await axios.put(`/api/v2/evolutions/${id}`, data);
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

  const renderDashboard = () => {
    const pi = patientInfo as any;
    const totalApts     = pi.totalAppointments ?? pi.stats?.totalAppointments ?? 0;
    const totalDone     = pi.totalCompleted     ?? pi.stats?.totalCompleted     ?? 0;
    const totalPending  = pi.totalPending       ?? pi.stats?.totalPending       ?? 0;
    const nextApt       = pi.nextAppointment;
    const nextAptDate   = nextApt?.date ? new Date(nextApt.date) : null;
    const ptTags: string[] = pi.tags || [];

    return (
    <>
      {/* ── KPI strip ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-5">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-500" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Atendimentos</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{totalApts}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{totalDone} concluídos</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><Activity size={18} /></div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className={`absolute inset-x-0 top-0 h-0.5 ${totalPending > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo pendente</p>
              <p className={`mt-1 text-xl font-extrabold ${totalPending > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {totalPending > 0 ? `R$ ${totalPending.toLocaleString('pt-BR')}` : 'R$ 0,00'}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">valor a receber</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><CreditCard size={18} /></div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-500" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Próxima sessão</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">
                {nextAptDate ? nextAptDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'Sem agenda'}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {nextAptDate ? `${nextApt.time || 'Horário pendente'} · ${nextApt.serviceType === 'evaluation' ? 'Avaliação' : nextApt.serviceType || 'Sessão'}` : 'Nenhuma sessão futura'}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><Calendar size={18} /></div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-violet-500" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Classificações</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ptTags.length > 0 ? ptTags.map((tag: string) => (
                  <span key={tag} className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${tag === 'debito' ? 'bg-red-100 text-red-700' : tag === 'vip' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>{tag}</span>
                )) : <span className="text-sm font-bold text-emerald-700">Regular</span>}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">situação atual do paciente</p>
            </div>
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><ShieldCheck size={18} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 mb-8">
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
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
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
              <div className="p-6 text-center">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">Nenhum agendamento hoje</h4>
                {nextApt && nextAptDate ? (
                  <div className="mt-3 mx-auto max-w-xs bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Próxima sessão</p>
                    <p className="text-sm font-bold text-blue-800">
                      {nextAptDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {nextApt.time && ` às ${nextApt.time}`}
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      {nextApt.serviceType === 'evaluation' ? 'Avaliação' : nextApt.serviceType || 'Sessão'}
                      {(nextApt.doctorName || nextApt.doctor?.fullName || nextApt.doctor?.name) && ` · ${nextApt.doctorName || nextApt.doctor?.fullName || nextApt.doctor?.name}`}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Nenhuma consulta agendada. Crie um agendamento para este paciente.
                  </p>
                )}
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
                        {appointment.operationalStatus === 'completed' || appointment.clinicalStatus === 'completed'
                          ? 'Atendimento concluído'
                          : appointment.operationalStatus === 'canceled'
                            ? 'Atendimento cancelado'
                            : appointment.operationalStatus === 'missed'
                              ? 'Falta registrada'
                              : 'Atendimento atualizado'}
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
            <button onClick={handleOpenHistory} className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors">
              Ver todas as atividades →
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de todos os atendimentos com filtros por mês/dia */}
      <div className="mb-8">
        <PatientAppointmentsTable appointments={allAppointmentsById} patientId={patientId} onMoved={loadAllAppointments} />
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

      {prescriptions.length > 0 && <Card>
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
      </Card>}
      {careTeam.length > 0 && <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>}

      <AppointmentHistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        appointments={allAppointmentsById}
      />
    </>
  );
  };


  const renderProfile = () => {
    const address = patientInfo.address;
    const fullAddress = address
      ? [address.street, address.number, address.district, address.city, address.state].filter(Boolean).join(', ')
      : '';
    const birthDate = patientInfo.dateOfBirth
      ? new Date(patientInfo.dateOfBirth).toLocaleDateString('pt-BR')
      : 'Não informado';

    const InfoItem = ({ label, value }: { label: string; value?: string | boolean }) => (
      <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
          {typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : value || 'Não informado'}
        </p>
      </div>
    );

    return (
      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white p-5 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <UserRound size={26} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Perfil do paciente</p>
              <h2 className="truncate text-xl font-extrabold text-slate-900">{patientInfo.fullName}</h2>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{birthDate}</span>
                <span>{patientInfo.gender || 'Gênero não informado'}</span>
                <span>{patientInfo.profession || 'Profissão não informada'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 lg:p-5">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <UserRound size={17} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Dados pessoais</h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <InfoItem label="Nome completo" value={patientInfo.fullName} />
                <InfoItem label="Nascimento" value={birthDate} />
                <InfoItem label="CPF" value={patientInfo.cpf} />
                <InfoItem label="RG" value={patientInfo.rg} />
                <InfoItem label="Estado civil" value={patientInfo.maritalStatus} />
                <InfoItem label="Naturalidade" value={patientInfo.placeOfBirth} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Phone size={17} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Contato e endereço</h3>
              </div>
              <div className="space-y-2.5">
                <InfoItem label="Telefone" value={patientInfo.phone} />
                <InfoItem label="E-mail" value={patientInfo.email} />
                <InfoItem label="Endereço" value={fullAddress} />
                <InfoItem label="CEP" value={address?.zipCode} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 lg:col-span-2">
              <div className="mb-3 flex items-center gap-2">
                <HeartPulse size={17} className="text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Informações clínicas</h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                <InfoItem label="Queixa principal" value={patientInfo.mainComplaint} />
                <InfoItem label="Histórico clínico" value={patientInfo.clinicalHistory} />
                <InfoItem label="Alergias" value={patientInfo.allergies} />
                <InfoItem label="Medicamentos" value={patientInfo.medications} />
                <InfoItem label="Histórico familiar" value={patientInfo.familyHistory} />
                <InfoItem label="Especialidades" value={patientInfo.specialties?.map(item => String(item).replaceAll('_', ' ')).join(', ')} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={17} className="text-violet-600" />
                <h3 className="text-sm font-bold text-slate-900">Responsáveis e autorizações</h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <InfoItem label="Responsável legal" value={patientInfo.legalGuardian} />
                <InfoItem label="Autorização de imagem" value={patientInfo.imageAuthorization} />
                <InfoItem label="Contato de emergência" value={patientInfo.emergencyContact?.name} />
                <InfoItem label="Telefone de emergência" value={patientInfo.emergencyContact?.phone} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={17} className="text-cyan-600" />
                <h3 className="text-sm font-bold text-slate-900">Plano de saúde</h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <InfoItem label="Convênio" value={patientInfo.healthPlan?.name} />
                <InfoItem label="Número da carteirinha" value={patientInfo.healthPlan?.policyNumber} />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };


  const renderEvolution = () => {
    if (!patientInfo) return null;

    return (
      <PatientEvolution
        patientId={patientInfo._id}
        patientName={patientInfo.fullName}
        initialEvolutions={evaluations}
      />
    );
  };

  const renderManagePackages = () => {
    if (!patientInfo) return null;

    return (
      <TherapyPackagesSummary patient={patientInfo} doctors={doctors} />
    );
  };

  const renderLiminar = () => {
    if (!patientInfo) return null;
    return (
      <div className="space-y-4">
        <LiminarContractPanel
          patientId={patientInfo._id || patientInfo.patientId || patientId}
          doctors={doctors}
          createTrigger={liminarCreateTrigger}
        />
      </div>
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
        <div className="relative mb-5 flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-500" />
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <Calendar size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                {patientInfo?.fullName || 'Paciente'}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Visão consolidada do acompanhamento clínico e financeiro.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowBalanceModal(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600"
          >
            <CreditCard size={18} />
            Fechar Atendimento
          </button>
        </div>


        {(pollingState.isPolling || isLoading) && <div className="mb-4 flex justify-end">
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
        </div>}

        <div className={activeTab === 'Dashboard' ? '' : 'bg-white rounded-xl border border-gray-100 shadow-sm p-6'}>
          {activeTab === 'Dashboard' && renderDashboard()}
          {activeTab === 'Profile' && renderProfile()}
          {activeTab === 'Appointment Booking' && renderAppointmentBooking()}
          {activeTab === 'Management Packages' && renderManagePackages()}
          {activeTab === 'Liminar' && renderLiminar()}
          {activeTab === 'Insurance Guides' && (patientInfo?.patientId || patientId) && <PatientInsuranceTab patientId={patientInfo?.patientId || patientId} patientName={patientInfo?.fullName} />}
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

      <PatientBalanceModal
        isOpen={showBalanceModal}
        onClose={() => setShowBalanceModal(false)}
        patientId={patientInfo?.patientId || patientId || ''}
        patientName={patientInfo?.fullName || ''}
        onRefresh={() => setShowBalanceModal(false)}
      />
    </div>
  );
}
