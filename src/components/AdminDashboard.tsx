import { Paper, Typography, useTheme } from '@mui/material';
import { BarChart3 } from "lucide-react";
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { IPatient, ScheduleAppointment } from '../../utils/types/types';
import { useAppointmentsContext } from '../contexts/AppointmentsContext';
import { useChatNavigation } from "../contexts/ChatNavigationContext";
import { useAdmin } from '../hooks/useAdmin';
import { useDashboard } from '../hooks/useDashboard';
import useDoctorDashboard from '../hooks/useDoctorDashboard';
import { usePatients } from '../hooks/usePatients';
import usePayment from '../hooks/usePayment';
import FinancialDashboard from '../pages/Financial/FinancialDashboard';
import FollowupPage from '../pages/FollowupPage';
import { AvailableSlotsParams, CancelParams, CreateAppointmentParams, UpdateAppointmentParams } from '../services/appointmentService';
import { CreateDoctorParams } from '../services/doctorService';
import { createPayment, FinancialRecord, getPayments, updatePayment } from '../services/paymentService';
import AddAdminContent from './admin/AddAdminContent';
import AdminHeader from './admin/AdminHeader';
import DashboardContentOptimized from './admin/DashboardContentOptimized';
import ProfileContent from './admin/ProfileContent';
import EnhancedCalendar from './calendar/EnhancedCalendar';
import SiteAnalyticsDashboard from './Dashboard/SiteAnalyticsDashboard';
import { AdvancedPaymentModal } from './financial/AdvancedPaymentModal';
import { PaymentModal } from './financial/PaymentModal';
import DoctorFormModal from './ManageDoctors/DoctorFormModal';
import ManageDoctors from './ManageDoctors/ManageDoctors';
import AppChat from './mkt/whatsapp/AppChat';
import { PatientModal } from './patients/PatientModal';

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
    imageAuthorization: false,
    birthCertificate: '',
    packages: [],
    nextAppointment: '',
    lastAppointment: ''
};

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [openMenu, setOpenMenu] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    // Estado local apenas para capacidade (valor fixo)
    const [hospitalCapacity] = useState(150);
    const [closeModalSignal, setCloseModalSignal] = useState(0);
    const [openModal, setOpenModal] = useState(false);
    const [openModalAppointment, setOpenModalAppointement] = useState(false);
    const { shouldOpenMessagesTab, setShouldOpenMessagesTab } = useChatNavigation();

    const [appointmentData, setAppointmentData] = useState({
        patient: '',
        doctor: '',
        date: '',
        time: '',
        type: '',
        reason: '',
        status: ''
    });
    const [agendamentoTemp, setAgendamentoTemp] = useState({
        profissional: '',
        data: '',
        hora: '',
        sessionType: '',
        status: '',
        motivo: ''
    });
    const [agendamentosTemp, setAgendamentosTemp] = useState([]);
    const [adminData, setAdminData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [modalShouldClose, setModalShouldClose] = useState(false);
    const [patientToEdit, setPatientToEdit] = useState<IPatient | undefined>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);
    const [showModalAddProfessional, setShowModalAddProfessional] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [allPayments, setAllPayments] = useState<any[]>([]);
    const [paymentContext, setPaymentContext] = useState<{
        mode: 'create' | 'edit';
        patient?: IPatient;
        payment?: FinancialRecord;
    }>({ mode: 'create' });
    const [showAdvancedPayment, setShowAdvancedPayment] = useState(false);

    // 🗓️ Estado para controle do range de datas do calendário
    const [calendarDateRange, setCalendarDateRange] = useState<{ startDate?: string; endDate?: string }>({});

    const navigate = useNavigate();
    const theme = useTheme();

    // 🎯 Hook otimizado do dashboard (substitui múltiplas chamadas)
    const {
        stats,
        doctors: doctorsOverview,
        upcomingAppointments: upcomingAppts,
        loading: dashboardLoading,
        refresh: refreshDashboard
    } = useDashboard();

    const { patients, totalPatients, fetchPatients, updatePatient, createPatient } = usePatients();
    const { doctors, createDoctor, updateDoctor } = useDoctorDashboard();
    const { adminInfo, editedInfo, setEditedInfo, loading, fetchAdminProfile, fetchCompletedAppointments, updateAdminProfile, addNewAdmin } = useAdmin();

    // Debug logs - mostrar quando os dados mudam (DEPOIS de declarar patients)
    useEffect(() => {
        console.log('🏥 AdminDashboard data changed:', {
            dashboardLoading,
            statsTotalPatients: stats?.totalPatients,
            doctorsCount: doctorsOverview?.length,
            upcomingApptsCount: upcomingAppts?.length,
            patientsCount: patients?.length
        });
    }, [dashboardLoading, stats, doctorsOverview, upcomingAppts, patients]);

    const {
        appointments,
        fetchAppointments,
        createAppointment,
        updateAppointment,
        completeAppointment,
        cancelAppointment,
        getAvailableSlots,
    } = useAppointmentsContext();


    const { markAsPaid } = usePayment();

    // 🗓️ Buscar appointments quando o range de datas mudar
    useEffect(() => {
        // Só buscar se tiver datas definidas (evita fetch vazio no primeiro render)
        if (!calendarDateRange.startDate || !calendarDateRange.endDate) {
            console.log('🏥 AdminDashboard: Aguardando calendarDateRange ser definido');
            return;
        }
        console.log('🏥 AdminDashboard: Buscando appointments com filtros:', calendarDateRange);
        fetchAppointments(calendarDateRange);
    }, [fetchAppointments, calendarDateRange]);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    // 🔄 Refresh dashboard quando mudar de aba para Dashboard
    useEffect(() => {
        if (activeTab === 'Dashboard') {
            refreshDashboard();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]); // Removido refreshDashboard das dependências para evitar loop

    const toggleMenu = (menuName: string) => {
        setOpenMenu(menuName);
    };

    useEffect(() => {
        if (shouldOpenMessagesTab) {
            console.log('🎯 AdminDashboard: Abrindo aba Mensagens');
            setActiveTab('Mensagens');
            setShouldOpenMessagesTab(false);
        }
    }, [shouldOpenMessagesTab, setShouldOpenMessagesTab]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setOpenMenu('');

        if (tab === 'Add Paciente') {
            handleAddPatient();
        }
    };

    const handleAddPatient = () => {
        setPatientToEdit(undefined);
        setIsModalOpen(true);
        setActiveTab('Dashboard');
    };

    const handleAddProfessional = () => {
        setPatientToEdit(undefined);
        setShowModalAddProfessional(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('sessionToken');
        navigate('/login');
    };

    const handleSaveDoctor = async (doctor: CreateDoctorParams) => {
        setIsLoading(true);
        try {
            if (doctor._id) {
                await updateDoctor(doctor);
                toast.success("Profissional atualizado com sucesso!");
            } else {
                await createDoctor(doctor);
                toast.success("Profissional cadastrado com sucesso!");
            }

            setModalShouldClose(true);
        } catch (error: any) {
            toast.error(error.message || "Erro ao salvar profissional.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSavePatient = async (formData: IPatient) => {
        setIsLoading(true);
        try {
            if (formData._id) {
                await updatePatient(formData._id, {
                    ...formData,
                    dateOfBirth: new Date(formData.dateOfBirth).toISOString()
                });
                toast.success("Paciente atualizado com sucesso!");
            } else {
                await createPatient({
                    ...formData,
                    dateOfBirth: new Date(formData.dateOfBirth).toISOString()
                });
                toast.success("Paciente criado com sucesso!");
            }

            return true; // sucesso
        } catch (error: any) {
            const msg =
                error?.response?.data?.error ||
                error?.response?.data?.message ||
                'Erro ao salvar paciente';
            toast.error(msg);

            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewAppointment = async (appointmentData: ScheduleAppointment) => {
        const specialty = appointmentData.specialty || appointmentData.sessionType;

        const payload: CreateAppointmentParams = {
            patientId: appointmentData.patientId,
            doctorId: appointmentData.doctorId,
            date: appointmentData.date,
            time: appointmentData.time,
            specialty,
            sessionType: specialty,
            serviceType: appointmentData.serviceType,
            notes: appointmentData.notes,
            paymentAmount: appointmentData.paymentAmount,
            paymentMethod: appointmentData.paymentMethod,
            reason: appointmentData.reason,
            clinicalStatus: 'pending',
            operationalStatus: 'scheduled',
            packageId: appointmentData.packageId,
            // 🏥 CONVÊNIO - ADICIONAR ESTAS 4 LINHAS:
            billingType: appointmentData.billingType,
            insuranceProvider: appointmentData.insuranceProvider,
            insuranceValue: appointmentData.insuranceValue,
            authorizationCode: appointmentData.authorizationCode,
            insurance: appointmentData.insurance,
        };

        try {
            await createAppointment(payload);
            await fetchAppointments(calendarDateRange);
            setCloseModalSignal(prev => prev + 1);
            toast.success('Agendamento criado com sucesso!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao criar agendamento');
        }
    };

    const handleCancelAppointment = async (appointmentId: string, reason: string) => {
        try {
            const cancelParams: CancelParams = {
                reason,
                notifyPatient: true
            };
            await cancelAppointment(appointmentId, cancelParams);
            toast.success('Agendamento cancelado!');
            fetchAppointments(calendarDateRange);
            setCloseModalSignal(prev => prev + 1);
        } catch (error) {
            const errorResponse = error.response?.data?.error || 'Erro ao cancelar agendamento';
            toast.error(errorResponse);
            throw error;
        }
    };

    const handleCompleteAppointment = async (appointmentId: string) => {
        try {
            console.log('bateu no paiii')
            await completeAppointment(appointmentId);
            toast.success('Agendamento marcado como concluído!');
            fetchAppointments(calendarDateRange);
            setCloseModalSignal(prev => prev + 1);
        } catch (error) {
            console.log('Erro ao Completar agendamento:', error);
            const errorResponse = error.response?.data?.message || 'Erro ao completar agendamento';
            toast.error(errorResponse);
            throw error;
        }
    };

    const handleEditAppointment = async (appointmentId: string, updatedData: UpdateAppointmentParams) => {
        try {
            await updateAppointment(appointmentId, updatedData);
            toast.success('Agendamento atualizado!');
            fetchAppointments(calendarDateRange);
            setCloseModalSignal(prev => prev + 1); // ✅ só fecha se sucesso
        } catch (error: any) {
            console.error('Erro ao editar agendamento:', error);

            // ✅ CORREÇÃO: pegar error.response?.data
            const errorData = error.response?.data;

            if (!errorData) {
                toast.error('Erro de conexão com o servidor');
                throw error; // ✅ Propaga erro para não fechar modal
            }

            // Conflito (write conflict ou slot taken)
            if (error.response?.status === 409) {
                toast.error(errorData.message || 'Conflito ao atualizar');
                if (errorData.code === 'WRITE_CONFLICT') {
                    setTimeout(() => window.location.reload(), 2000);
                }
                throw error; // ✅ Propaga erro para não fechar modal
            }

            // Validação de campos
            if (error.response?.status === 400 && errorData.fields) {
                toast.error('Verifique os campos destacados');
                // TODO: se tiver setFieldErrors, chame aqui
                throw error; // ✅ Propaga erro para não fechar modal
            }

            // Erro genérico
            toast.error(errorData.message || 'Erro ao atualizar agendamento');
            throw error; // ✅ Propaga erro para não fechar modal
        }
    };

    const handleFetchAvailableSlots = async (payload: AvailableSlotsParams): Promise<string[]> => {
        try {
            const slots = await getAvailableSlots(payload);
            return slots;
        } catch (error) {
            toast.error('Erro ao buscar horários disponíveis');
            return [];
        }
    };

    const openPaymentModal = (context: {
        mode: 'create' | 'edit';
        patient?: IPatient;
        payment?: FinancialRecord;
    }) => {
        setPaymentContext(context);
        setPaymentModalOpen(true);
    };

    const handleAdvancedPayment = async (data: any) => {
        setShowAdvancedPayment(true);
    };

    const handleCreatePayment = async (data: any) => {
        try {
            await createPayment(data);
            toast.success('Pagamento registrado com sucesso!');
            setPaymentModalOpen(false);
            setPaymentContext({ mode: 'create' });
            loadPayments();
        } catch (error) {
            toast.error('Erro ao registrar pagamento');
        }
    };

    const handleUpdatePayment = async (data: any) => {
        try {
            if (paymentContext.payment?._id) {
                await updatePayment(paymentContext.payment._id, data);
                fetchAppointments(calendarDateRange);
                toast.success('Pagamento atualizado com sucesso!');

                setTimeout(() => {
                    setPaymentModalOpen(false);
                    setPaymentContext({ mode: 'create' });
                    loadPayments();
                }, 300);
            }
        } catch (error) {
            toast.error('Erro ao atualizar pagamento');
        }
    };

    useEffect(() => {
        loadPayments();
    }, []);

    const handleRegisterAppointmentAndPayemntFuture = (payment: FinancialRecord) => {
        if (!payment || typeof payment !== 'object') {
            console.error('Pagamento inválido:', payment);
            return;
        }

        setPaymentContext({
            mode: 'edit',
            payment
        });
        setPaymentModalOpen(true);
    };

    const handleMarkAsPaid = async (payment: FinancialRecord) => {
        try {
            await markAsPaid(payment._id);        // <- não existe response.ok aqui
            toast.success('Pagamento marcado como pago!');
            await Promise.all([loadPayments(), fetchAppointments(calendarDateRange)]);
        } catch (error: any) {
            console.error('Erro ao marcar pagamento:', error);
            console.log('Erro ao marcar pagamentosssssssss:', error);
            toast.error(error.response.data.message || error.message);
        }
    };

    const loadPayments = async () => {
        try {
            const res = await getPayments();
            setAllPayments(res.data.data);
        } catch (error) {
            console.error('Erro ao carregar pagamentos:', error);
            toast.error('Erro ao carregar pagamentos');
        }
    };

    const handleCancelPayment = async (paymentId: string) => {
        try {
            await updatePayment(paymentId, { status: 'canceled' });
            loadPayments();
            toast.success('Pagamento cancelado com sucesso!');
        } catch (error) {
            toast.error('Erro ao cancelar pagamento');
        }
    };

    const handleEspecialidadeToggle = (id: string) => {
        setPatientToEdit(prev => {
            if (!prev) return prev;

            const hasSelected = prev.specialties.includes(id);
            return {
                ...prev,
                specialties: hasSelected
                    ? prev.specialties.filter((esp) => esp !== id)
                    : [...prev.specialties, id],
            };
        });
    };

    // 🗓️ Handler para quando o usuário muda de mês no calendário
    const handleMonthChange = useCallback((startDate: Date, endDate: Date) => {
        const formatDateForAPI = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const startDateStr = formatDateForAPI(startDate);
        const endDateStr = formatDateForAPI(endDate);

        // ✅ FIX: Apenas atualiza o estado - o useEffect cuidará do fetch
        setCalendarDateRange(prev => {
            if (prev.startDate === startDateStr && prev.endDate === endDateStr) {
                console.log('🏥 AdminDashboard: Range igual, ignorando');
                return prev;
            }
            console.log('🏥 AdminDashboard: Atualizando calendarDateRange', {
                startDate: startDateStr,
                endDate: endDateStr
            });
            return { startDate: startDateStr, endDate: endDateStr };
        });
    }, []);  // ✅ Removido fetchAppointments das dependências

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return (
                    <DashboardContentOptimized
                        stats={stats}
                        doctors={doctorsOverview}
                        upcomingAppointments={upcomingAppts}
                        patients={patients}
                        loading={dashboardLoading}
                        onRefresh={refreshDashboard}
                        handleAddProfessional={handleAddProfessional}
                        handleAddPatient={handleAddPatient}
                        setPatientToEdit={setPatientToEdit}
                        setIsModalOpen={setIsModalOpen}
                        setShowAdvancedPayment={setShowAdvancedPayment}
                        setSelectedPatient={setSelectedPatient}
                        setPaymentContext={setPaymentContext}
                        setPaymentModalOpen={setPaymentModalOpen}
                    />
                );
            case 'Profile':
                return (
                    <ProfileContent
                        adminInfo={adminInfo}
                        editedInfo={editedInfo}
                        setEditedInfo={setEditedInfo}
                        isEditing={isEditing}
                        setIsEditing={setIsEditing}
                        updateAdminProfile={updateAdminProfile}
                    />
                );
            case 'Add Admin':
                return <AddAdminContent addNewAdmin={addNewAdmin} />;
            case 'Add Profissional':
                return (
                    <ManageDoctors
                        onSubmitDoctor={handleSaveDoctor}
                        doctors={doctors}
                        patients={patients}
                        openModal={openModal}
                        appointments={appointments}
                        setOpenModal={setOpenModal}
                        onNewAppointment={handleNewAppointment}
                        modalShouldClose={modalShouldClose}
                        closeModalSignal={closeModalSignal}
                    />
                );
            case 'Calendário':
                return (
                    <EnhancedCalendar
                        doctors={doctors}
                        patients={patients}
                        appointments={appointments}
                        onDateClick={() => { }}
                        onNewAppointment={handleNewAppointment}
                        onCancelAppointment={handleCancelAppointment}
                        onCompleteAppointment={handleCompleteAppointment}
                        onEditAppointment={handleEditAppointment}
                        onFetchAvailableSlots={handleFetchAvailableSlots}
                        onMonthChange={handleMonthChange}
                        openModalAppointment={openModalAppointment}
                        closeModalSignal={closeModalSignal}
                    />
                );
            case 'Financeiro':
                return (
                    <FinancialDashboard
                        patients={patients}
                        doctors={doctors}
                        initialPayments={allPayments}
                        onMarkAsPaid={handleMarkAsPaid}
                        registerAppointmentAndPayemntFuture={handleRegisterAppointmentAndPayemntFuture}
                        onCancelPayment={handleCancelPayment}
                    />
                );
            case 'Leads':
                return <FollowupPage />;
            case 'Analytics':
                return (
                    <SiteAnalyticsDashboard
                        patients={patients}
                        doctors={doctors}
                        payments={allPayments}
                        onMarkAsPaid={handleMarkAsPaid}
                        registerAppointmentAndPayemntFuture={handleRegisterAppointmentAndPayemntFuture}
                        onCancelPayment={handleCancelPayment}
                    />
                );

            case 'Mensagens':
                return <AppChat />;
            default:
                return <div>Conteúdo não encontrado</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 text-gray-800">
            <AdminHeader
                activeTab={activeTab}
                openMenu={openMenu}
                adminInfo={adminInfo}
                handleTabChange={handleTabChange}
                toggleMenu={toggleMenu}
                setActiveTab={setActiveTab}
                onLogout={handleLogout}
            />

            <main className="max-w-[95%] lg:max-w-[85rem] mx-auto px-8 py-0">

                {/* <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {TAB_TITLES[activeTab]}
                    </h2>
                </div> */}

                <div className="bg-white rounded-lg shadow-sm space-y-6 p-6 overflow-hidden">
                    {activeTab === 'Dashboard' && (
                        <Paper
                            elevation={2}
                            sx={{
                                p: 4,
                                mb: 4,
                                mt: 2,
                                borderRadius: 3,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
                            }}
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                {/* Ícone e título */}
                                <div className="flex items-center gap-4">
                                    <div
                                        className="p-3 rounded-2xl"
                                        style={{ backgroundColor: 'rgba(55,171,135,0.15)' }}
                                    >
                                        <BarChart3 size={24} style={{ color: '#00C087' }} />
                                    </div>

                                    <div>
                                        <Typography variant="h4" fontWeight="bold" color="grey.800">
                                            Visão Geral da Clínica
                                        </Typography>
                                        <Typography variant="body2" color="grey.600">
                                            Acompanhe métricas, desempenho e indicadores do atendimento em tempo real.
                                        </Typography>
                                    </div>
                                </div>
                            </div>
                        </Paper>
                    )}
                    {renderContent()}
                </div>
            </main>


            {/* Modais */}
            {isModalOpen && (
                <PatientModal
                    open={isModalOpen}
                    patient={patientToEdit || initialPatientState}
                    onClose={() => {
                        setIsModalOpen(false);
                        setPatientToEdit(undefined);
                    }}
                    onSaveSuccess={async (formData) => {
                        const success = await handleSavePatient(formData);
                        if (success) {
                            setIsModalOpen(false);
                            setPatientToEdit(undefined);
                            setActiveTab('Dashboard');
                        }
                    }}
                />
            )}

            <DoctorFormModal
                open={showModalAddProfessional}
                patients={patients}
                onClose={() => setShowModalAddProfessional(false)}
                onSubmitDoctor={handleSaveDoctor}
                loading={isLoading}
            />

            {paymentModalOpen && (
                <PaymentModal
                    open={paymentModalOpen}
                    patient={paymentContext.patient}
                    doctors={doctors}
                    payment={paymentContext.payment}
                    onClose={() => {
                        setPaymentModalOpen(false);
                        setPatientToEdit(undefined);
                    }}
                    onPaymentSuccess={
                        paymentContext.mode === 'create'
                            ? handleCreatePayment
                            : handleUpdatePayment
                    }
                />
            )}

            <AdvancedPaymentModal
                open={showAdvancedPayment}
                patients={patients}
                doctors={doctors}
                onClose={() => setShowAdvancedPayment(false)}
                onPaymentAdvancedSuccess={handleAdvancedPayment}
            />
        </div>
    );
}