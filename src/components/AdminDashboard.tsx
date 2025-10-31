import { Paper, Typography, useTheme } from '@mui/material';
import { BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ErrorResponse, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppointmentsContext } from '../contexts/AppointmentsContext';
import { useAdmin } from '../hooks/useAdmin';
import { useAppointments } from '../hooks/useAppointments';
import useDoctorDashboard from '../hooks/useDoctorDashboard';
import { usePatients } from '../hooks/usePatients';
import FollowupPage from '../pages/FollowupPage';
import { AvailableSlotsParams, CancelParams, CreateAppointmentParams, UpdateAppointmentParams } from '../services/appointmentService';
import { CreateDoctorParams } from '../services/doctorService';
import { createPayment, FinancialRecord, getPayments, updatePayment } from '../services/paymentService';
import { IAppointment, IPatient } from '../utils/types/types';
import AddAdminContent from './admin/AddAdminContent';
import AdminHeader from './admin/AdminHeader';
import DashboardContent from './admin/DashboardContent';
import ProfileContent from './admin/ProfileContent';
import EnhancedCalendar from './calendar/EnhancedCalendar';
import AnalyticsDashboard from './Dashboard/AnalyticsDashboard';
import { AdvancedPaymentModal } from './financial/AdvancedPaymentModal';
import { PaymentModal } from './financial/PaymentModal';
import PaymentPage from './financial/PaymentPage';
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
    const [showDoctorPassword, setShowDoctorPassword] = useState(false);
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [totalDoctors, setTotalDoctors] = useState(0);
    const [doctorOverview, setDoctorOverview] = useState([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [hospitalCapacity] = useState(150);
    const [closeModalSignal, setCloseModalSignal] = useState(0);
    const [openModal, setOpenModal] = useState(false);
    const [openModalAppointment, setOpenModalAppointement] = useState(false);
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
    const navigate = useNavigate();
    const theme = useTheme();

    const { patients, totalPatients, patientOverview, fetchPatients, updatePatient, createPatient } = usePatients();
    const { createAppointment, updateAppointment, completeAppointment, cancelAppointment, getAvailableSlots } = useAppointments();
    const { doctors, createDoctor, updateDoctor } = useDoctorDashboard();
    const { adminInfo, editedInfo, setEditedInfo, completedAppointments, loading, fetchAdminProfile, fetchCompletedAppointments, updateAdminProfile, addNewAdmin } = useAdmin();
    const { appointments, fetchAppointments } = useAppointmentsContext();

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    const toggleMenu = (menuName: string) => {
        setOpenMenu(menuName);
    };

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
            toast.error(error.response?.data?.error || 'Erro ao salvar paciente.');
            return false; // falha
        } finally {
            setIsLoading(false);
        }
    };


    const handleNewAppointment = async (appointmentData: IAppointment) => {
        const payload: CreateAppointmentParams = {
            patientId: appointmentData.patientId || '',
            doctorId: appointmentData.doctorId || '',
            date: appointmentData.date,
            time: appointmentData.time,
            serviceType: appointmentData.serviceType,
            notes: appointmentData.notes,
            paymentAmount: appointmentData.paymentAmount,
            paymentMethod: appointmentData.paymentMethod,
            reason: appointmentData.reason,
            specialty: appointmentData.sessionType,
            clinicalStatus: 'pending',
            operationalStatus: 'scheduled',
            packageId: appointmentData.packageId
        };

        try {
            await createAppointment(payload);
            await fetchAppointments();
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
            fetchAppointments();
            setCloseModalSignal(prev => prev + 1);
        } catch (error) {
            console.log('Erro ao cancelar agendamento:', error);
            const errorResponse = error.response.data.error as ErrorResponse;
            toast.error(errorResponse);
        }
    };

    const handleCompleteAppointment = async (appointmentId: string) => {
        try {
            console.log('bateu no paiii')
            await completeAppointment(appointmentId);
            toast.success('Agendamento marcado como concluído!');
            fetchAppointments();
            setCloseModalSignal(prev => prev + 1);
        } catch (error) {
            console.log('Erro ao cancelar agendamento:', error);
            const errorResponse = error.response.data.message as ErrorResponse;
            toast.error(errorResponse);
        }
    };

    const handleEditAppointment = async (appointmentId: string, updatedData: UpdateAppointmentParams) => {
        try {
            await updateAppointment(appointmentId, updatedData);
            toast.success('Agendamento atualizado!');
            fetchAppointments();
            setCloseModalSignal(prev => prev + 1);
        } catch (error: any) {
            console.log('Erro ao cancelar agendamento:', error);
            const errorResponse = error.response.data.error as ErrorResponse;
            toast.error(errorResponse);
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
                fetchAppointments();
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

    const handleMarkAsPaid = (payment: FinancialRecord) => {
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

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return (
                    <DashboardContent
                        patients={patients}
                        totalPatients={totalPatients}
                        totalDoctors={doctors.length}
                        hospitalCapacity={hospitalCapacity}
                        doctorOverview={doctorOverview}
                        upcomingAppointments={upcomingAppointments}
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
                        openModalAppointment={openModalAppointment}
                        closeModalSignal={closeModalSignal}
                    />
                );
            case 'Financeiro':
                return (
                    <PaymentPage
                        patients={patients}
                        initialPayments={allPayments}
                        doctors={doctors}
                        onMarkAsPaid={handleMarkAsPaid}
                        onCancelPayment={handleCancelPayment}
                    />
                );
            case 'Leads':
                return <FollowupPage />;
            case 'Analytics':
                return <AnalyticsDashboard />;
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


            <main className="max-w-[95%] lg:max-w-[85rem] mx-auto px-8 py-8">
                {activeTab === 'Dashboard' && (
                    <Paper
                        elevation={2}
                        sx={{
                            p: 3,
                            mb: 3,
                            borderRadius: 2,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
                        }}
                    >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            {/* Ícone e título */}
                            <div className="flex items-center gap-3">
                                <div
                                    className="p-2 rounded-lg"
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

                {/* mantém o conteúdo existente */}
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {activeTab === 'Dashboard'}
                        {activeTab === 'Profile' && 'Meu Perfil'}
                        {activeTab === 'Add Profissional'}
                        {activeTab === 'Calendário'}
                        {activeTab === 'Financeiro'}
                        {activeTab === 'Leads'}
                        {activeTab === 'Mensagens'}
                        {activeTab === 'Add Admin' && 'Adicionar Administrador'}
                    </h2>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
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