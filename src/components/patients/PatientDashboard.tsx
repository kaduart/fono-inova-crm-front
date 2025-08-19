import axios from 'axios';
import { Activity, Calendar, Calendar as CalendarIcon, ChevronDown, FileText, Home, Hospital, LineChart, Plus, UserCircle, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from "react-hot-toast";
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { BASE_URL } from '../../constants/constants';
import { useAppointments } from '../../hooks/useAppointments';
import { usePatients } from '../../hooks/usePatients';
import { AvailableSlotsParams, CreateAppointmentParams } from '../../services/appointmentService';
import { createEvaluation, deleteEvaluation, getEvaluationsByPatient, updateEvaluation } from '../../services/evaluationService';
import { IAppointment, IDoctors, IPatient } from '../../utils/types/types';
import AppointmentHistoryModal from '../AppointmentHistoryModal';
import ScheduleModal from '../AppointmentPage';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { FutureSessionsCard } from './FutureSessionsCard';
import { PatientAvailablesCard } from './PatientAvailablesCard';
import PatientEvolution from './PatientEvolution';
import { PatientMiniCalendar } from './PatientMiniCalendar';
import TherapyPackagesSummary from './TherapyPackagesSummary';

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

  const {
    fetchAppointmentsByPatient,
    /*   fetchAppointments,
      createAppointment,
      updateAppointment,
      completeAppointment,
      cancelAppointment,
      getAvailableSlots */
  } = useAppointments();


  useEffect(() => {
    if (patientId) {
      const fetch = async () => {
        try {
          const response = await fetchAppointmentsByPatient(patientId);
          setAllAppointmentsById(response);
        } catch (err) {
          console.error('Erro ao buscar agendamentos por paciente:', err);
        }
      };

      fetch();
    }
  }, [patientId, fetchAppointmentsByPatient]);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  const {
    patients,
    /*   fetchPatients,
      updatePatient,
      createPatient */
  } = usePatients();

  const {
    appointments,
    fetchAppointments,
    createAppointment,
    /* updateAppointment,
    completeAppointment,
    cancelAppointment,*/
    getAvailableSlots
  } = useAppointments();
  const handleNewAppointment = async (appointmentData: IAppointment) => {
    try {
      const payload: CreateAppointmentParams = {
        patientId: appointmentData.patientId,
        doctorId: appointmentData.doctorId,
        date: appointmentData.date,
        time: appointmentData.time,
        reason: appointmentData.reason,
        specialty: appointmentData.sessionType,
        clinicalStatus: 'pendente',
        operationalStatus: 'agendado'
      };

      await createAppointment(payload);
      toast.success('Agendamento criado com sucesso!');
      fetchAppointments();

      setOpenSchedule(false);

    } catch (error) {
      toast.error('Erro ao criar agendamento');
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


  const fetchPatientProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${BASE_URL}/patients/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPatientInfo(data);
        setEditedInfo(data);
      } else {
        console.error('Falhou ao busca os dados do paciente');
      }
    } catch (error) {
      console.error('Erro ao busca os dados do paciente:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch(BASE_URL + '/doctors', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDoctors(data);
      } else {
        console.error('Failed to fetch doctors');
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
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
  const today = new Date().toISOString().split('T')[0]; // formato 'YYYY-MM-DD'

  const todaysAppointments = appointments?.filter((appt) => {

    const apptDate = new Date(appt.date).toISOString().split('T')[0];
    return apptDate === today;
  });

  const fetchAvailableSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(BASE_URL + `/patient/available-slots?doctorId=${doctorId}&date=${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const slots = await response.json();
        setAvailableSlots(slots);
      } else {
        console.error('Failed to fetch available slots');
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
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

  const fetchCompletedAppointments = async () => {
    /* try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
  
      const response = await fetch(BASE_URL + '/patient/appointment/completed-cancelled', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (response.ok) {
        const data = await response.json();
        setCompletedAppointments(data);
      } else {
        console.error('Failed to fetch completed/cancelled appointments');
      }
    } catch (error) {
      console.error('Error fetching completed/cancelled appointments:', error);
    } */
  };


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

  useEffect(() => {
    if (activeTab === 'Evolution' && patientInfo?._id) {
      const fetchEvolutions = async () => {
        try {
          const response = await axios.get(`/api/evolutions/patient/${patientInfo._id}`);
          setEvolutions(response.data);
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
    fetchCompletedAppointments();
  }, []);

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

        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Agendamentos para Hoje</h3>
                <p className="text-sm text-gray-600 mt-1">

                  <div className="flex justify-end items-center mb-0">
                    <span className="text-sm text-gray-500">
                      Atualizado em {new Date().toLocaleString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric'
                      })}
                    </span>
                  </div>
                </p>
              </div>
            </div>
          </div>

          <div className="p-1">
            {todaysAppointments.length > 0 ? (
              <div className="space-y-3">
                {todaysAppointments.map((appointment) => (
                  <div
                    key={appointment._id}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 truncate">
                          {appointment.doctor ? `Dr. ${appointment.doctor.fullName}` : 'Profissional não especificado'}
                        </h4>
                        <span className="text-sm font-medium text-gray-500">
                          {appointment.time}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${appointment.operationalStatus === 'confirmado'
                          ? 'bg-green-100 text-green-800'
                          : appointment.operationalStatus === 'cancelado'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                          }`}>
                          {appointment.operationalStatus}
                        </span>
                        <span className="text-xs text-gray-500">
                          {appointment.duration} min
                        </span>
                      </div>

                      {appointment.notes && (
                        <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                          {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <div className="mx-auto bg-gray-100 p-4 rounded-full w-max">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto" />
                </div>
                <h4 className="mt-4 text-lg font-medium text-gray-900">
                  Nenhum agendamento hoje
                </h4>
                <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                  Você não tem consultas agendadas para hoje. Agende uma nova consulta para começar.
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-between">
            <button
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              onClick={handleOpenHistory}
            >
              Ver histórico completo
            </button>

          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-5 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-teal-100 p-2 rounded-lg">
                <Activity className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Atividades Recentes</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Histórico das últimas consultas
                </p>
              </div>
            </div>
          </div>

          <div className="p-1">
            {completedAppointments.length > 0 ? (
              <div className="space-y-4 p-4">
                {completedAppointments.slice(0, 3).map((appointment) => (
                  <div key={appointment._id} className="relative pl-6">
                    <div className="absolute left-0 top-3 w-3 h-3 rounded-full bg-teal-500"></div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between">
                        <h4 className="font-medium text-gray-900">
                          {appointment.operationalStatus === 'confirmado'
                            ? 'Consulta realizada'
                            : 'Consulta cancelada'}
                        </h4>
                        <span className="text-xs font-medium text-gray-500">
                          {new Date(appointment.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-shrink-0">
                          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            Dr. {appointment.doctor?.fullName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {appointment.time} • {appointment.duration} min
                          </p>
                        </div>
                      </div>

                      {appointment.history?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Última ação:</span> {appointment.history[0].action}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(appointment.history[0].timestamp).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <div className="mx-auto bg-gray-100 p-4 rounded-full w-max">
                  <Activity className="h-8 w-8 text-gray-400 mx-auto" />
                </div>
                <h4 className="mt-4 text-lg font-medium text-gray-900">
                  Nenhuma atividade recente
                </h4>
                <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                  Suas consultas realizadas e agendamentos futuros aparecerão aqui.
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 text-center">
            <button className="text-sm font-medium text-teal-600 hover:text-teal-800 transition-colors">
              Ver todas as atividades
            </button>
          </div>
        </div>
      </div>

      {patientInfo?._id && (
        <FutureSessionsCard patientId={patientInfo._id} />
      )}

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
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setAppointmentData(prev => ({ ...prev, [name]: value }));

      if (name === 'date' || name === 'doctorId') {
        fetchAvailableSlots(appointmentData.doctorId, value);
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(BASE_URL + '/patient/book-appointment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(appointmentData)
        });
        if (response.ok) {
          const result = await response.json();
          setAppointmentData({
            doctorId: '',
            date: '',
            time: '',
            reason: ''
          });
          setAvailableSlots([]);
          fetchAppointments();
          return toast.success('Appointment booked successfully.');
        } else {
          const errorData = await response.json();
          return toast.error(`Failed to book appointment.`);
        }
      } catch (error) {
        return toast.error('Error booking appointment. Please try again.');
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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <NavLink
                to="/admin"
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="bg-blue-100/80 p-2.5 rounded-xl shadow-sm">
                  <Hospital className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-blue-500 transition-all duration-300">
                  Fono<span className="font-extrabold">Inova</span>
                </span>
              </NavLink>
            </div>

            <nav className="hidden md:flex items-center space-x-2">
              <Button
                variant={activeTab === 'Dashboard' ? 'secondary' : 'ghost'}
                onClick={() => setActiveTab('Dashboard')}
                className="px-3 py-2 rounded-md text-sm font-medium"
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>

              <Button
                variant={activeTab === 'Profile' ? 'secondary' : 'ghost'}
                onClick={() => setActiveTab('Profile')}
                className="px-3 py-2 rounded-md text-sm font-medium"
              >
                <UserCircle className="h-4 w-4 mr-2" />
                Perfil
              </Button>

              <Button
                variant={activeTab === 'Appointment Booking' ? 'secondary' : 'ghost'}
                onClick={() => setActiveTab('Appointment Booking')}
                className="px-3 py-2 rounded-md text-sm font-medium"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Agendamentos
              </Button>

              <Button
                variant={activeTab === 'Management Packages' ? 'secondary' : 'ghost'}
                onClick={() => setActiveTab('Management Packages')}
                className="px-3 py-2 rounded-md text-sm font-medium"
              >
                Pacotes
              </Button>

              <Button
                variant={activeTab === 'Evolution' ? 'secondary' : 'ghost'}
                onClick={() => setActiveTab('Evolution')}
                className="px-3 py-2 rounded-md text-sm font-medium"
              >
                <LineChart className="h-4 w-4 mr-2" />
                Evolução
              </Button>
            </nav>

            <button
              onClick={() => setActiveTab('Profile')}
              className="p-1 rounded-full text-gray-600 hover:text-blue-600 focus:outline-none"
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {patientInfo?.fullName?.charAt(0) || 'P'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center m-4">
            <UserCircle className="h-8 w-8 text-blue-500" />
            <h1 className="text-2xl font-semibold text-gray-800">
              {patientInfo?.fullName || 'Paciente'}
            </h1>
          </div>
          <div className='flex justify-end items-center'>
            <button
              /*   onClick={() => handleOpenSchedule(null, 'create')} */
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Novo Agendamento
            </button>
          </div>

        </div>

        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {activeTab === 'Dashboard'}
            {activeTab === 'Profile' && 'Meu Perfil'}
            {activeTab === 'Appointment Booking' && 'Agendamentos'}
            {activeTab === 'Management Packages' && 'Pacotes de Terapia'}
            {activeTab === 'Evolution' && 'Evolução do Tratamento'}
          </h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'Dashboard' && renderDashboard()}
          {activeTab === 'Appointment Booking' && renderAppointmentBooking()}
          {activeTab === 'Management Packages' && renderManagePackages()}
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