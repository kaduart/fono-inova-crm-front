import { Box, Typography, useTheme } from '@mui/material';

import { BarChart3, CalendarPlus } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import moment from 'moment-timezone';
import { mapToCreateAppointmentDTO } from '../dtos/appointment.dto';
import { invalidateCache } from '../utils/cacheManager';

// 🔧 Helper para lazy loading com retry em caso de falha de chunk
const lazyWithRetry = (importFn: () => Promise<any>, retries = 3, delay = 1500) => {
  return lazy(() => {
    let attempts = 0;
    
    const tryLoad = (): Promise<any> => {
      attempts++;
      return importFn().catch((error: any) => {
        // Se for erro de chunk não encontrado (atualização de build)
        const isChunkError = error?.name === 'TypeError' || 
                           error?.message?.includes('Failed to fetch dynamically imported module') ||
                           error?.message?.includes('load failed');
        
        if (isChunkError) {
          console.warn(`[AdminDashboard] Chunk load failed (attempt ${attempts}/${retries})`);
          
          // Se ainda tem tentativas, aguarda e tenta novamente
          if (attempts < retries) {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(tryLoad());
              }, delay * attempts); // Backoff exponencial simples
            });
          }
          
          // Última tentativa falhou - loga erro sem reload para evitar loop
          console.error('[AdminDashboard] Chunk failed after all retries. NOT reloading — check build output.', error);
          throw error;
        }
        
        throw error;
      });
    };
    
    return tryLoad();
  });
};
import { FinancialLoading } from '../pages/Financial/components/FinancialLoading';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { confirmToast } from '../utils/confirmToast';
import { extractErrorMessage, extractScheduleConflictMessage, isCriticalError } from '../utils/errorUtils';
import { TabErrorBoundary } from './error/TabErrorBoundary';
import { IPatient, ScheduleAppointment } from '../../utils/types/types';
import { useAppointmentsContext } from '../contexts/AppointmentsContext';
import { useChatNavigation } from "../contexts/ChatNavigationContext";
import { useChatOptional } from '../contexts/ChatContext'; // 🆕 Para mensagens de erro no chat
import { useAdmin } from '../hooks/useAdmin';
import { useDashboard } from '../hooks/useDashboard';
import { usePatients } from '../hooks/usePatients';
import { usePaymentsContext } from '../contexts/PaymentsContext';
import { SystemHealthProvider } from '../contexts/SystemHealthContext';
import WhatsAppCriticalBanner from './admin/WhatsAppCriticalBanner';
import usePayment from '../hooks/usePayment';
import { AvailableSlotsParams, CancelParams, CreateAppointmentParams, UpdateAppointmentParams } from '../services/appointmentService';
import doctorService, { CreateDoctorParams } from '../services/doctorService';
import API from '../services/api';
import { createPayment, FinancialRecord, getPaymentsV2, updatePayment } from '../services/paymentService';
// 🚫 REMOVIDO: import do usePixSocket para evitar reload automático
// import { usePixSocket } from '../hooks/usePixSocket';
import AddAdminContent from './admin/AddAdminContent';
import AdminHeader from './admin/AdminHeader';
import DashboardContentOptimized from './admin/DashboardContentOptimized';
import ProfileContent from './admin/ProfileContent';
import FinancialDashboard from '../pages/Financial/FinancialDashboard';

// 🚀 LAZY LOADING - Componentes de abas secundárias só carregam quando necessário

const FollowupPage = lazyWithRetry(() => import('../pages/FollowupPage'));
const PreAgendamentosPage = lazyWithRetry(() => import('../pages/Secretaria/PreAgendamentosPage'));
const EnhancedCalendar = lazyWithRetry(() => import('./calendar/EnhancedCalendar'));
const SiteAnalyticsDashboard = lazyWithRetry(() => import('./Dashboard/SiteAnalyticsDashboard'));
const MarketingDashboard = lazyWithRetry(() => import('./Dashboard/MarketingDashboard'));
const RevenueTab = lazyWithRetry(() => import('./Dashboard/RevenueTab'));
const AppChat = lazyWithRetry(() => import('./mkt/whatsapp/AppChat'));

// Componentes de abas específicas - só carregam quando a aba é aberta
const AmandaMetricsDashboard = lazyWithRetry(() => import('./admin/AmandaMetricsDashboard'));
const SystemUnifiedDashboard = lazyWithRetry(() => import('./admin/SystemUnifiedDashboard'));
const WhatsAppConnectionCard = lazyWithRetry(() => import('./admin/WhatsAppConnectionCard'));
const ManageDoctors = lazyWithRetry(() => import('./ManageDoctors/ManageDoctors'));
const ManagePatients = lazyWithRetry(() => import('./ManagePatients/ManagePatients'));
const DoctorFormModal = lazyWithRetry(() => import('./ManageDoctors/DoctorFormModal'));
const PatientModal = lazyWithRetry(() => import('./patients/PatientModal').then(m => ({ default: m.PatientModal })));

// Modais lazy loaded
const AdvancedPaymentModal = lazyWithRetry(() => import('./financial/AdvancedPaymentModal').then(m => ({ default: m.AdvancedPaymentModal })));
const PaymentModal = lazyWithRetry(() => import('./financial/PaymentModal').then(m => ({ default: m.PaymentModal })));

const TabSpinner = () => (
    <LoadingSpinner centered size="large" color="border-emerald-600" className="min-h-[400px]" />
);

const ModalSkeleton = () => (
    <Box sx={{ p: 4, minHeight: 200 }}>
        <FinancialLoading cardCount={1} gridSize={{ xs: 12 }} cardHeight={120} />
    </Box>
);

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
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // 🎯 Lê a aba da URL ou usa 'Dashboard' como padrão
    const activeTab = searchParams.get('tab') || 'Dashboard';
    
    // 📝 Atualiza a URL quando muda de aba
    const setActiveTab = useCallback((tab: string) => {
        setSearchParams({ tab });
    }, [setSearchParams]);

    // 🔄 Migra URLs antigas (Observability / Monitor) para a aba unificada Sistema
    useEffect(() => {
        if (activeTab === 'Observability' || activeTab === 'Monitor') {
            setSearchParams({ tab: 'Sistema' });
        }
    }, [activeTab, setSearchParams]);
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
    // 🚀 SOURCE OF TRUTH: Context API (não state local)
    const { payments: allPayments, setPayments: setAllPayments, loadPayments } = usePaymentsContext();
    const [paymentContext, setPaymentContext] = useState<{
        mode: 'create' | 'edit';
        patient?: IPatient;
        payment?: FinancialRecord;
    }>({ mode: 'create' });
    const [showAdvancedPayment, setShowAdvancedPayment] = useState(false);
    const [hasLoadedAppointments, setHasLoadedAppointments] = useState(false);

    // 🗓️ Carrega agendamentos SÓ quando abrir aba Calendário pela primeira vez
    useEffect(() => {
        if ((activeTab === 'Calendário' || activeTab === 'Pré-Agendamentos') && !hasLoadedAppointments) {
            // Inicializa o range com a data atual
            setCalendarDateRange({
                startDate: moment().startOf('month').format('YYYY-MM-DD'),
                endDate: moment().endOf('month').format('YYYY-MM-DD')
            });
            setHasLoadedAppointments(true);
        }
    }, [activeTab, hasLoadedAppointments]);

    // 🗓️ Estado para controle do range de datas do calendário
    const [calendarDateRange, setCalendarDateRange] = useState<{ startDate?: string; endDate?: string }>({});
    
    // 🎯 Listener removido - modal de agendamento agora abre direto no PaymentPage
    
    // 🎯 Estado para identificar o tipo de usuário
    const [userRole, setUserRole] = useState<string | null>(null);
    
    // 🎯 Verifica o role do usuário no localStorage
    useEffect(() => {
        const storedRole = localStorage.getItem('userRole');
        if (storedRole) {
            try {
                const parsedRole = JSON.parse(storedRole);
                setUserRole(parsedRole);
                console.log('👤 [AdminDashboard] User role:', parsedRole);
            } catch {
                setUserRole(storedRole); // Se não for JSON, usa direto
            }
        }
    }, []);

    // 🚀 Prefetch lazy chunks das abas secundárias em background
    useEffect(() => {
        window.requestIdleCallback?.(() => {
            import('../pages/FollowupPage');
            import('../pages/Secretaria/PreAgendamentosPage');
            import('./calendar/EnhancedCalendar');
            import('./ManageDoctors/ManageDoctors');
        }) ?? setTimeout(() => {
            import('../pages/FollowupPage');
            import('../pages/Secretaria/PreAgendamentosPage');
            import('./calendar/EnhancedCalendar');
            import('./ManageDoctors/ManageDoctors');
        }, 3000);
    }, []);

    const theme = useTheme();

    // 🎯 Hook otimizado do dashboard (substitui múltiplas chamadas)
    const {
        stats,
        doctors: doctorsOverview,
        upcomingAppointments: upcomingAppts,
        loading: dashboardLoading,
        refresh: refreshDashboard
    } = useDashboard();


    // 🎯 USA API V2
    const { patients, pagination, refresh, updatePatient, createPatient, deletePatient } = usePatients();
    const totalPatients = pagination?.total ?? patients.length;
    
    // 🚀 IMPORTANTE: AdminDashboard NÃO usa useDoctorDashboard!
    // useDoctorDashboard é SÓ para o DoctorDashboard (perfil de médico)
    // Admin usa useDashboard que já tem os dados necessários (doctorsOverview)
    const { adminInfo, editedInfo, setEditedInfo, loading, fetchAdminProfile, fetchCompletedAppointments, updateAdminProfile, addNewAdmin } = useAdmin();

    const {
        appointments,
        fetchAppointments,
        createAppointment,
        updateAppointment,
        completeAppointment,
        confirmAppointment,
        pollAppointmentStatus, // 🚀 V2: Polling para atualização async
        cancelAppointment,
        getAvailableSlots,
        isLoading: appointmentsLoading,
    } = useAppointmentsContext();


    const { markAsPaid } = usePayment();

    // 🗓️ Buscar appointments quando o range de datas mudar (só se já carregou a aba)
    useEffect(() => {
        if (hasLoadedAppointments && calendarDateRange.startDate && calendarDateRange.endDate) {
            console.log('📅 AdminDashboard: Buscando appointments para range:', calendarDateRange);
            fetchAppointments({ ...calendarDateRange, light: true });
        }
    }, [fetchAppointments, calendarDateRange.startDate, calendarDateRange.endDate, hasLoadedAppointments]);

    // 🚫 REMOVIDO: Atualização automática do calendário via socket
    // Agora o usuário precisa atualizar manualmente (F5 ou trocar de aba)
    // Isso evita reloads sozinhos que atrapalham o trabalho
    /*
    usePixSocket({
        onCalendarRefresh: useCallback(() => {
            if (hasLoadedAppointments && calendarDateRange.startDate && calendarDateRange.endDate) {
                fetchAppointments({ ...calendarDateRange, light: true });
            }
        }, [fetchAppointments, calendarDateRange, hasLoadedAppointments]),
    });
    */

    // 🎯 Pacientes já são carregados pela API V2
    // Não precisa chamar refresh no mount

    // Nota: useDashboard gerencia seu próprio cache, não precisa refresh forçado ao trocar aba

    const toggleMenu = useCallback((menuName: string) => {
        setOpenMenu(menuName);
    }, []);

    useEffect(() => {
        if (shouldOpenMessagesTab) {
            console.log('🎯 AdminDashboard: Abrindo aba Mensagens');
            setActiveTab('Mensagens');
            setShouldOpenMessagesTab(false);
        }
    }, [shouldOpenMessagesTab, setShouldOpenMessagesTab]);

    const handleTabChange = useCallback((tab: string) => {
        setActiveTab(tab);
        setOpenMenu('');

    }, []);

    const handleAddPatient = useCallback(() => {
        setPatientToEdit(undefined);
        setIsModalOpen(true);
        setActiveTab('Dashboard');
    }, []);

    const handleAddProfessional = useCallback(() => {
        setPatientToEdit(undefined);
        setShowModalAddProfessional(true);
    }, []);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('sessionToken');
        navigate('/login');
    }, [navigate]);

    const handleSaveDoctor = useCallback(async (doctor: CreateDoctorParams) => {
        console.log('[AdminDashboard] handleSaveDoctor chamado com:', doctor);
        setIsLoading(true);
        try {
            if (doctor._id) {
                console.log('[AdminDashboard] Modo EDITAR. Chamando doctorService.update...');
                await doctorService.update(doctor._id, doctor, { skipPolling: true });
                toast.success("Profissional atualizado com sucesso!");
            } else {
                console.log('[AdminDashboard] Modo CRIAR. Chamando doctorService.create...');
                await doctorService.create(doctor, { skipPolling: true });
                toast.success("Profissional cadastrado com sucesso!");
            }

            setShowModalAddProfessional(false);
            setModalShouldClose(true);
            setTimeout(() => setModalShouldClose(false), 600);

            // Não invalidar cache aqui — dispara fetch imediato antes do worker terminar.
            // A lista é atualizada via refreshDoctors() no ManageDoctors após delay adequado.
            setTimeout(() => refreshDashboard(), 4000);
        } catch (error: any) {
            console.error('[AdminDashboard] Erro em handleSaveDoctor:', error);
            toast.error(extractErrorMessage(error, "Erro ao salvar profissional."));
            throw error; // Re-throw para o modal saber que falhou
        } finally {
            setIsLoading(false);
        }
    }, [refreshDashboard]);

    const handleSavePatient = useCallback(async (formData: IPatient) => {
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
            toast.error(extractErrorMessage(error, 'Erro ao salvar paciente'));

            return false;
        } finally {
            setIsLoading(false);
        }
    }, [updatePatient, createPatient]);

    const handleNewAppointment = useCallback(async (appointmentData: ScheduleAppointment) => {
        const specialty = appointmentData.specialty || appointmentData.sessionType;

        const payload = mapToCreateAppointmentDTO({
            ...appointmentData,
            specialty,
            sessionType: specialty,
            clinicalStatus: 'pending',
            operationalStatus: 'scheduled',
        });

        try {
            await createAppointment(payload);
            await fetchAppointments(calendarDateRange);
            refreshDashboard(); // 🔄 Atualiza cards do dashboard
            setCloseModalSignal(prev => prev + 1);
            toast.success('Agendamento criado com sucesso!');
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao criar agendamento'));
            throw error; // modal exibe o erro no banner
        }
    }, [createAppointment, fetchAppointments, calendarDateRange, refreshDashboard]);

    // 🆕 Hook para mensagens de erro no chat (opcional - só funciona se estiver na aba de chat)
    const chat = useChatOptional();

    const handleCancelAppointment = useCallback(async (appointmentId: string, reason: string, paymentState?: { paymentMethod?: string; billingType?: string; sessionValue?: number }) => {
        try {
            const cancelParams: CancelParams = {
                reason,
                notifyPatient: true,
                ...paymentState
            };
            const result = await cancelAppointment(appointmentId, cancelParams);
            
            // 🔴 WORKER FALHOU: Lock foi liberado automaticamente
            if (result?._lockReleased) {
                toast.error('❌ Worker falhou ou foi reiniciado. Por favor, tente novamente.', { 
                    id: `cancel-error-${appointmentId}`,
                    autoClose: false
                });
                throw new Error('WORKER_FAILED');
            }
            
            toast.success('Agendamento cancelado!');
            // 🔄 Força refresh para garantir atualização imediata na tela
            fetchAppointments({ ...calendarDateRange, force: true });
            refreshDashboard(); // 🔄 Atualiza cards do dashboard
            setCloseModalSignal(prev => prev + 1);
        } catch (error) {
            const errorResponse = extractErrorMessage(error, 'Erro ao cancelar agendamento');
            
            // 🆕 Toast com ID para evitar spam de erros repetidos
            toast.error(errorResponse, { id: errorResponse });
            
            // 🆕 Só envia pro chat se for erro crítico (conflito, regra de negócio)
            if (isCriticalError(error)) {
                chat?.addSystemMessage?.(`❌ ${errorResponse}`, 'error');
            }
            
            throw error;
        }
    }, [cancelAppointment, fetchAppointments, calendarDateRange, refreshDashboard, chat]);

    const handleConfirmAppointment = useCallback(async (appointmentId: string, notes?: string) => {
        try {
            await confirmAppointment(appointmentId, notes);
            setCloseModalSignal(prev => prev + 1);
            await fetchAppointments({ ...calendarDateRange, force: true });
        } catch (error: any) {
            console.error('[AdminDashboard] Erro ao confirmar presença:', error);
            const errorResponse = extractErrorMessage(error, 'Erro ao confirmar presença');
            toast.error(`❌ ${errorResponse}`, { id: `confirm-error-${appointmentId}` });
            throw error;
        }
    }, [confirmAppointment, fetchAppointments, calendarDateRange]);

    const handleCompleteAppointment = useCallback(async (appointmentId: string, data?: {
        addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string;
        billingType?: string; paymentMethod?: string; paymentAmount?: number; sessionValue?: number;
        insuranceProvider?: string; insuranceValue?: number; authorizationCode?: string;
        payments?: Array<{ amount: number; date: string; method: string }>;
    }) => {
        try {
            console.log('[AdminDashboard] Completando agendamento:', appointmentId, data);
            
            // 🚀 V2: O contexto já faz polling internamente e aguarda completação
            const result = await completeAppointment(appointmentId, data);

            // 🔍 DEBUG: Loga o resultado completo
            console.log('[AdminDashboard] Resultado do complete:', {
                status: result?.data?.status,
                _isAsyncProcessing: result?._isAsyncProcessing,
                _completed: result?._completed,
                _lockReleased: result?._lockReleased
            });

            // 🚨 VERIFICAÇÃO DE SEGURANÇA: Só considera completado se EXPLICITAMENTE retornar _completed === true
            // Se for processamento async, OBRIGATORIAMENTE precisa ter _completed === true
            const isAsync = result?._isAsyncProcessing === true;
            const asyncCompleted = result?._completed === true;
            const lockReleased = result?._lockReleased === true;
            
            // ✅ REGRA: Só está completo se:
            // 1. For async E _completed === true, OU
            // 2. Não for async (legado) E status não for processing
            const isProcessingStatus = result?.data?.status?.startsWith('processing');
            const completed = isAsync ? asyncCompleted : !isProcessingStatus;
            
            // 🔴 WORKER FALHOU: Lock foi liberado automaticamente - usuário precisa tentar de novo
            if (lockReleased) {
                toast.error('❌ Falha no processamento. Por favor, tente novamente.', { 
                    id: `error-${appointmentId}`,
                    autoClose: false
                });
                // ❌ NÃO fecha o modal
                throw new Error('WORKER_FAILED');
            }
            
            // 🚨 AINDA PROCESSANDO: Não deveria chegar aqui (o contexto deveria aguardar), mas por segurança:
            if (isProcessingStatus && !isAsync) {
                console.warn('[AdminDashboard] ⚠️ Status é processing mas não é async - aguardando polling...');
                toast.info('⏳ Processando... Aguarde a confirmação.', { 
                    id: `processing-${appointmentId}`,
                    autoClose: false
                });
                // ❌ NÃO fecha o modal
                throw new Error('STILL_PROCESSING');
            }
            
            if (completed) {
                toast.success('✅ Agendamento finalizado com sucesso!', { id: `success-${appointmentId}` });
                
                // ✅ Fecha modal e loading imediatamente — refresh roda em background
                setCloseModalSignal(prev => prev + 1);

                // 🔄 Refresh em background sem bloquear o modal
                setTimeout(() => {
                    fetchAppointments({ ...calendarDateRange, force: true });
                    refreshDashboard();
                }, 300);
                
                // 🆕 DISPARA EVENTO para atualizar Card Caixa
                window.dispatchEvent(new CustomEvent('cash:refresh', { 
                    detail: { appointmentId, timestamp: Date.now() } 
                }));
                
                // 🔄 DISPARA EVENTO global para atualizar calendário
                window.dispatchEvent(new CustomEvent('appointments:refresh', { 
                    detail: { appointmentId, timestamp: Date.now() } 
                }));
            } else {
                // 🚨 FALHOU: Não fecha o modal, usuário pode tentar de novo
                toast.error('❌ Falha ao finalizar. Tente novamente.', { 
                    id: `error-${appointmentId}`,
                    autoClose: false // Não some sozinho
                });
                // ❌ NÃO fecha o modal - deixa usuário tentar de novo
                throw new Error('PROCESSING_FAILED');
            }
        } catch (error) {
            console.log('Erro ao Completar agendamento:', error);
            const errorResponse = extractErrorMessage(error, 'Erro ao completar agendamento');
            
            // 🆕 Toast com ID para evitar spam
            toast.error(errorResponse, { id: `complete-error-${appointmentId}` });
            
            // 🆕 Só envia pro chat se for erro crítico
            if (isCriticalError(error)) {
                chat?.addSystemMessage?.(`❌ ${errorResponse}`, 'error');
            }
            
            // 🚨 IMPORTANTE: Lança erro para o modal saber que falhou
            throw error;
        }
    }, [completeAppointment, fetchAppointments, calendarDateRange, refreshDashboard, chat]);

    const handleEditAppointment = useCallback(async (appointmentId: string, updatedData: UpdateAppointmentParams) => {
        console.log('🔄 [AdminDashboard] Editando agendamento:', appointmentId, updatedData);

        // ✅ Appointment já completed → vai direto para admin-edit, sem PUT → 409
        if ((updatedData as any).operationalStatus === 'completed') {
            try {
                const adminPayload = { ...updatedData, adminReason: 'Correção administrativa em atendimento finalizado' };
                console.log('🔓 [AdminDashboard] Completed detectado — admin-edit direto:', JSON.stringify(adminPayload));
                const adminResult = await API.patch(`/v2/appointments/${appointmentId}/admin-edit`, adminPayload);
                console.log('🔓 [AdminDashboard] admin-edit response:', JSON.stringify(adminResult?.data));
                if (adminResult?.data?.success !== true) {
                    const errMsg = adminResult?.data?.error || adminResult?.data?.message || 'Falha ao salvar alterações';
                    toast.error(`❌ ${errMsg}`, { id: `admin-edit-error-${appointmentId}` });
                    return;
                }
                setCloseModalSignal(prev => prev + 1);
                toast.success('✅ Agendamento atualizado (admin)!');
                await fetchAppointments({ ...calendarDateRange, force: true });
                window.dispatchEvent(new CustomEvent('appointments:refresh', {
                    detail: { appointmentId, timestamp: Date.now() }
                }));
                window.dispatchEvent(new CustomEvent('cash:refresh'));
                return;
            } catch (adminErr: any) {
                const adminMsg = extractErrorMessage(adminErr, 'Erro no admin-edit');
                toast.error(`❌ ${adminMsg}`, { id: `admin-edit-error-${appointmentId}` });
                return;
            }
        }

        try {
            const result = await updateAppointment(appointmentId, updatedData);
            
            // 🔍 DEBUG: Loga o resultado
            console.log('✅ [AdminDashboard] Resultado do update:', {
                status: result?.status,
                data: result?.data,
                success: result?.data?.success
            });

            // 🚨 VERIFICAÇÃO: Só considera sucesso se EXPLICITAMENTE retornar success
            // Axios retorna a resposta em result.data
            const isSuccess = result?.data?.success === true || result?.data?.data?._id || result?.data?.data?.appointment;
            
            if (!isSuccess) {
                console.error('❌ [AdminDashboard] Update retornou sem sucesso explícito:', result);
                toast.error('❌ Falha ao atualizar. Tente novamente.', { 
                    id: `edit-error-${appointmentId}`,
                    autoClose: false
                });
                throw new Error('UPDATE_FAILED');
            }
            
            console.log('✅ [handleEdit] API ok — iniciando refresh de lista');
            toast.success('✅ Agendamento atualizado!');
            console.log('📥 [handleEdit] fetchAppointments START — range:', calendarDateRange);
            await fetchAppointments({ ...calendarDateRange, force: true });
            console.log('📥 [handleEdit] fetchAppointments DONE — appointments state vai atualizar');
            // Evento informativo (nenhum componente deve re-disparar fetch ao ouvir isso)
            window.dispatchEvent(new CustomEvent('appointments:data-updated', {
                detail: { appointmentId, timestamp: Date.now() }
            }));
            console.log('🔔 [handleEdit] closeModalSignal++');
            setCloseModalSignal(prev => prev + 1);
            
            // 🆕 Se status foi alterado para completed, atualiza Card Caixa
            if (updatedData.operationalStatus === 'completed' || updatedData.clinicalStatus === 'completed') {
                console.log('📢 [AdminDashboard] Status concluído detectado, disparando cash:refresh');
                window.dispatchEvent(new CustomEvent('cash:refresh', { 
                    detail: { appointmentId, status: 'completed', timestamp: Date.now() } 
                }));
            }
        } catch (error: any) {
            console.error('Erro ao editar agendamento:', error);

            const errorData = error.response?.data;
            const msg = extractErrorMessage(error, 'Erro ao atualizar agendamento');

            // Admin e secretária podem editar atendimentos finalizados via admin-edit
            if (errorData?.code === 'CANNOT_EDIT_COMPLETED_APPOINTMENT') {
                try {
                    const adminPayload = { ...updatedData, adminReason: 'Correção administrativa em atendimento finalizado' };
                    console.log('🔓 [AdminDashboard] admin-edit payload:', JSON.stringify(adminPayload));
                    const adminResult = await API.patch(`/v2/appointments/${appointmentId}/admin-edit`, adminPayload);
                    console.log('🔓 [AdminDashboard] admin-edit response:', JSON.stringify(adminResult?.data));
                    if (adminResult?.data?.success !== true) {
                        const errMsg = adminResult?.data?.error || adminResult?.data?.message || 'Falha ao salvar alterações administrativas';
                        toast.error(`❌ ${errMsg}`, { id: `admin-edit-error-${appointmentId}` });
                        return;
                    }
                    // Fecha o modal PRIMEIRO — evita que fique aberto ao receber eventos
                    setCloseModalSignal(prev => prev + 1);
                    toast.success('✅ Agendamento atualizado (admin)!');
                    // Depois do modal fechado, atualiza o calendário e o financeiro
                    await fetchAppointments({ ...calendarDateRange, force: true });
                    window.dispatchEvent(new CustomEvent('appointments:refresh', {
                        detail: { appointmentId, timestamp: Date.now() }
                    }));
                    window.dispatchEvent(new CustomEvent('cash:refresh'));
                    return;
                } catch (adminErr: any) {
                    const adminMsg = extractErrorMessage(adminErr, 'Erro no admin-edit');
                    toast.error(`❌ ${adminMsg}`, { id: `admin-edit-error-${appointmentId}` });
                    return; // não propaga — modal já mostraria toast duplicado
                }
            }

            if (!errorData) {
                toast.error('Erro de conexão com o servidor');
                throw error;
            }

            // Conflito (write conflict ou slot taken)
            if (error.response?.status === 409) {
                const conflictDetail = extractScheduleConflictMessage(error);
                if (conflictDetail) {
                    toast.error((t) => (
                        <div className="flex flex-col gap-1">
                            <div className="font-semibold text-sm">⚠️ Conflito de agenda</div>
                            <div className="text-sm leading-snug">{conflictDetail}</div>
                        </div>
                    ), {
                        id: `slot-conflict-${appointmentId}`,
                        autoClose: 8000,
                        style: { maxWidth: '420px', borderLeft: '4px solid #ef4444' }
                    });
                    throw error;
                }
                if (errorData.code === 'APPOINTMENT_SLOT_CONFLICT') {
                    toast.error(`⚠️ ${msg}`, {
                        id: `slot-conflict-${appointmentId}`,
                        autoClose: 8000,
                        style: { fontWeight: 600 }
                    });
                    throw error;
                }
                toast.error(msg, { id: msg });
                if (errorData.code === 'WRITE_CONFLICT') {
                    // 🔄 Atualização suave em vez de reload
                    toast.info('Sincronizando dados...', { id: 'sync-data' });
                    await fetchAppointments({ ...calendarDateRange, force: true });
                    await refreshDashboard();
                    // 🔔 Notifica outros componentes para atualizar
                    window.dispatchEvent(new CustomEvent('appointments:refresh', {
                        detail: { timestamp: Date.now(), reason: 'write_conflict_resolved' }
                    }));
                }
                throw error;
            }

            // Validação de campos
            if (error.response?.status === 400 && errorData.fields) {
                toast.error('Verifique os campos destacados');
                throw error;
            }

            // Erro genérico
            toast.error(msg, { id: msg });
            throw error;
        }
    }, [updateAppointment, fetchAppointments, calendarDateRange, refreshDashboard]);

    const handleFetchAvailableSlots = useCallback(async (payload: AvailableSlotsParams): Promise<string[]> => {
        try {
            const slots = await getAvailableSlots(payload);
            return slots;
        } catch (error) {
            toast.error('Erro ao buscar horários disponíveis');
            return [];
        }
    }, [getAvailableSlots]);

    const openPaymentModal = useCallback((context: {
        mode: 'create' | 'edit';
        patient?: IPatient;
        payment?: FinancialRecord;
    }) => {
        setPaymentContext(context);
        setPaymentModalOpen(true);
    }, []);

    const handleAdvancedPayment = useCallback(async (data: any) => {
        setShowAdvancedPayment(true);
    }, []);

    const currentMonth = new Date().toISOString().substring(0, 7);

    // ⚠️ V1 LEGADO: handleCreatePayment cria Payment manualmente.
    // ✅ V2 REALIDADE: Payment nasce no schedule ou no complete (handler).
    // Só usar para pagamentos avulsos (não vinculados a agendamento).
    const handleCreatePayment = useCallback(async (data: any) => {
        try {
            await createPayment(data);
            toast.success('Pagamento registrado com sucesso!');
            setPaymentModalOpen(false);
            setPaymentContext({ mode: 'create' });
            loadPayments(currentMonth);
        } catch (error) {
            toast.error('Erro ao registrar pagamento');
        }
    }, [loadPayments, currentMonth]);

    const handleUpdatePayment = useCallback(async (data: any) => {
        try {
            const payment = paymentContext.payment;
            if (!payment?._id) {
                toast.error('Nenhum pagamento selecionado');
                return;
            }

            // 🚨 GARANTIA: se não tem payment real, não pode dar PATCH
            if ((payment as any).__isAppointmentRecord && !(payment as any).__hasPayment) {
                toast.info('💳 Este agendamento não possui pagamento para editar. Registre primeiro.');
                return;
            }

            // 🚨 GARANTIA: usa paymentId real, nunca appointmentId
            const targetId = (payment as any).__realPaymentId || payment._id;
            await updatePayment(targetId, data);
            fetchAppointments(calendarDateRange);
            toast.success('Pagamento atualizado com sucesso!');

            setTimeout(() => {
                setPaymentModalOpen(false);
                setPaymentContext({ mode: 'create' });
                loadPayments(currentMonth);
            }, 300);
        } catch (error) {
            toast.error('Erro ao atualizar pagamento');
        }
    }, [paymentContext.payment, fetchAppointments, calendarDateRange, loadPayments, currentMonth]);

    // 🚀 OTIMIZAÇÃO: Não carrega pagamentos no reload inicial
    // Só carrega quando necessário (lazy loading na aba Financeiro)
    // loadPayments() é chamado manualmente quando a aba é aberta

    const handleRegisterAppointmentAndPayemntFuture = useCallback((payment: FinancialRecord) => {
        if (!payment || typeof payment !== 'object') {
            console.error('Pagamento inválido:', payment);
            return;
        }

        setPaymentContext({
            mode: 'edit',
            payment
        });
        setPaymentModalOpen(true);
    }, []);

    // 🛡️ Proteção contra cliques duplos / race condition no mark-as-paid
    const isMarkingAsPaidRef = useRef(false);

    const handleMarkAsPaid = useCallback(async (payment: FinancialRecord) => {
        if (isMarkingAsPaidRef.current) {
            toast('⏳ Aguarde, processando...', { icon: '⏳' });
            return;
        }

        try {
            isMarkingAsPaidRef.current = true;

            let targetId = (payment as any).__realPaymentId;
            
            // 🆕 SESSÃO AVULSA SEM PAYMENT: cria o payment automaticamente via V2 antes de marcar como pago
            if ((payment as any).__isAppointmentRecord && !targetId) {
                const amount = payment.amount || 0;

                try {
                    const createRes = await API.post('/v2/payments/create-sync', {
                        patientId: payment.patientId || (payment.patient as any)?._id || payment.patient?.id,
                        doctorId: payment.doctorId || (payment.doctor as any)?._id || payment.doctor?.id,
                        amount,
                        paymentMethod: payment.paymentMethod || 'dinheiro',
                        status: 'paid',
                        appointmentId: payment._id,
                        serviceType: payment.serviceType || 'session',
                        paymentDate: new Date().toISOString(),      // caixa = data do recebimento (hoje)
                        serviceDate: payment.date || null,           // competência = data da sessão
                        notes: payment.notes || payment.description || 'Pagamento registrado via tabela financeira'
                    });
                    
                    const createdPayment = createRes.data?.data || createRes.data;
                    targetId = createdPayment?._id || createdPayment?.id;
                    
                    if (!targetId) {
                        throw new Error('Pagamento criado mas ID não retornado');
                    }
                    
                    console.log(`[handleMarkAsPaid] Payment auto-criado (V2) para appointment ${payment._id}: ${targetId}`);
                } catch (error: any) {
                    // Passa erro do backend (ex: amount inválido) direto pro usuário
                    const backendMsg = error.response?.data?.error || error.message;
                    throw new Error(backendMsg);
                }
            }

            await markAsPaid(targetId || payment._id);
            toast.success('Pagamento marcado como pago!');
            await Promise.all([loadPayments(currentMonth), fetchAppointments(calendarDateRange)]);
        } catch (error: any) {
            console.error('Erro ao marcar pagamento:', error);
            toast.error(extractErrorMessage(error, 'Erro ao marcar pagamento'));
        } finally {
            isMarkingAsPaidRef.current = false;
        }
    }, [markAsPaid, fetchAppointments, calendarDateRange, loadPayments, currentMonth]);

    const handleCancelPayment = useCallback(async (paymentId: string) => {
        try {
            // 🚨 GARANTIA: se não tem payment real, não há o que cancelar
            const payment = allPayments.find(p => p._id === paymentId);
            if (payment && (payment as any).__isAppointmentRecord && !(payment as any).__hasPayment) {
                toast.info('💳 Este agendamento não possui pagamento para cancelar.');
                return;
            }

            await updatePayment(paymentId, { status: 'canceled' });
            loadPayments(currentMonth);
            toast.success('Pagamento cancelado com sucesso!');
        } catch (error) {
            toast.error('Erro ao cancelar pagamento');
        }
    }, [loadPayments, currentMonth, allPayments]);

    const handleEspecialidadeToggle = useCallback((id: string) => {
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
    }, []);

    // 🗑️ Handler para deletar paciente com confirmação
    const handleDeletePatient = useCallback(async (patient: IPatient) => {
        const patientId = patient._id || (patient as any).patientId || (patient as any).id;
        if (!patientId) return;

        const confirmed = await confirmToast(
            `Tem certeza que deseja excluir o paciente "${patient.fullName}"? Esta ação não pode ser desfeita.`
        );

        if (!confirmed) return;

        try {
            await deletePatient(patientId);
            toast.success('Paciente excluído com sucesso!');
            // 🔄 Atualiza o dashboard
            refreshDashboard();
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao excluir paciente'));
        }
    }, [deletePatient, refreshDashboard]);

    // 🗓️ Handler para quando o usuário muda de mês no calendário
    const handleMonthChange = useCallback((startDate: Date, endDate: Date) => {
        // 🎯 FIX: O FullCalendar passa a grade visível (ex: 30/03 a 02/05).
        // Pegamos o meio do intervalo para garantir o mês correto (abril, não março).
        const middleDate = new Date(startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2);
        const monthStart = moment(middleDate).startOf('month').format('YYYY-MM-DD');
        const monthEnd = moment(middleDate).endOf('month').format('YYYY-MM-DD');

        // ✅ FIX: Apenas atualiza o estado - o useEffect cuidará do fetch
        setCalendarDateRange(prev => {
            if (prev.startDate === monthStart && prev.endDate === monthEnd) {
                console.log('🏥 AdminDashboard: Range igual, ignorando');
                return prev;
            }
            console.log('🏥 AdminDashboard: Atualizando calendarDateRange', {
                startDate: monthStart,
                endDate: monthEnd
            });
            return { startDate: monthStart, endDate: monthEnd };
        });
    }, []);  // ✅ Removido fetchAppointments das dependências

    const safeDoctorsOverview = Array.isArray(doctorsOverview) ? doctorsOverview : [];

    // 🎯 Props memoizadas para evitar re-renders desnecessários
    const dashboardProps = useMemo(() => ({
        stats,
        doctors: safeDoctorsOverview,
        upcomingAppointments: upcomingAppts,
        patients,
        loading: dashboardLoading,
        onRefresh: refreshDashboard,
        handleAddProfessional,
        handleAddPatient,
        setPatientToEdit,
        setIsModalOpen,
        setShowAdvancedPayment,
        setSelectedPatient,
        setPaymentContext,
        setPaymentModalOpen,
        onDeletePatient: handleDeletePatient,
    }), [stats, safeDoctorsOverview, upcomingAppts, patients, dashboardLoading, refreshDashboard,
        handleAddProfessional, handleAddPatient, handleDeletePatient]);

    const manageDoctorsProps = useMemo(() => ({
        onSubmitDoctor: handleSaveDoctor,
        doctors: safeDoctorsOverview,
        patients,
        openModal,
        appointments,
        setOpenModal,
        onNewAppointment: handleNewAppointment,
        modalShouldClose,
        closeModalSignal,
        onDoctorsChange: refreshDashboard, // 🆕 Atualiza lista após inativação/reativação
    }), [handleSaveDoctor, safeDoctorsOverview, patients, openModal, appointments, handleNewAppointment, 
        modalShouldClose, closeModalSignal, refreshDashboard]);

    const calendarProps = useMemo(() => ({
        // 🐛 FIX: Mapear doctorsOverview para ter fullName em vez de name
        doctors: (safeDoctorsOverview.map(d => ({ 
            ...d, 
            fullName: d.name || d.fullName 
        }))) as any,
        patients,
        appointments,
        onDateClick: () => { },
        onNewAppointment: handleNewAppointment,
        onCancelAppointment: handleCancelAppointment,
        onCompleteAppointment: handleCompleteAppointment,
        onConfirmAppointment: handleConfirmAppointment,
        onEditAppointment: handleEditAppointment,
        onFetchAvailableSlots: handleFetchAvailableSlots,
        onMonthChange: handleMonthChange,
        openModalAppointment,
        closeModalSignal,
        loading: appointmentsLoading,
    }), [safeDoctorsOverview, patients, appointments, handleNewAppointment, handleCancelAppointment,
        handleCompleteAppointment, handleEditAppointment, handleFetchAvailableSlots,
        handleMonthChange, openModalAppointment, closeModalSignal, appointmentsLoading]);

    const financialProps = useMemo(() => ({
        patients,
        doctors: safeDoctorsOverview,
        initialPayments: allPayments,
        onMarkAsPaid: handleMarkAsPaid,
        registerAppointmentAndPayemntFuture: handleRegisterAppointmentAndPayemntFuture,
        onCancelPayment: handleCancelPayment,
    }), [patients, safeDoctorsOverview, allPayments, handleMarkAsPaid, handleRegisterAppointmentAndPayemntFuture, 
        handleCancelPayment]);

    const analyticsProps = useMemo(() => ({
        patients,
        doctors: safeDoctorsOverview,
        payments: allPayments,
        onMarkAsPaid: handleMarkAsPaid,
        registerAppointmentAndPayemntFuture: handleRegisterAppointmentAndPayemntFuture,
        onCancelPayment: handleCancelPayment,
    }), [patients, safeDoctorsOverview, allPayments, handleMarkAsPaid, handleRegisterAppointmentAndPayemntFuture, 
        handleCancelPayment]);

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return (
                    <TabErrorBoundary tabName="Dashboard">
                        <DashboardContentOptimized {...dashboardProps} />
                    </TabErrorBoundary>
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
                return <AddAdminContent addNewAdmin={addNewAdmin} role="admin" />;
            case 'Add Secretária':
                return <AddAdminContent addNewAdmin={addNewAdmin} role="secretary" />;
            case 'Add Profissional':
                return (
                    <Suspense fallback={<TabSpinner />}>
                        <ManageDoctors {...manageDoctorsProps} />
                    </Suspense>
                );
            case 'Add Paciente':
                return (
                    <Suspense fallback={<TabSpinner />}>
                        <ManagePatients />
                    </Suspense>
                );
            case 'Calendário':
                return (
                    <TabErrorBoundary tabName="Calendário">
                        <div className="flex justify-end mb-3">
                            <button
                                onClick={() => setActiveTab('Pré-Agendamentos')}
                                className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow transition-colors"
                            >
                                <CalendarPlus size={16} /> Pré-Agendamentos
                            </button>
                        </div>
                        <Suspense fallback={<TabSpinner />}>
                            <EnhancedCalendar {...calendarProps} />
                        </Suspense>
                    </TabErrorBoundary>
                );
            case 'Financeiro':
                return (
                    <TabErrorBoundary tabName="Financeiro">
                        <FinancialDashboard {...financialProps} />
                    </TabErrorBoundary>
                );
            case 'Leads':
                return (
                    <TabErrorBoundary tabName="Leads & Follow-up">
                        <Suspense fallback={<TabSpinner />}>
                            <FollowupPage />
                        </Suspense>
                    </TabErrorBoundary>
                );
            case 'SocialMedia':
                return (
                    <TabErrorBoundary tabName="Social Media">
                        <Suspense fallback={<TabSpinner />}>
                            <MarketingDashboard />
                        </Suspense>
                    </TabErrorBoundary>
                );
            case 'Analytics':
                return (
                    <TabErrorBoundary tabName="Analytics">
                        <Suspense fallback={<TabSpinner />}>
                            <SiteAnalyticsDashboard {...analyticsProps} />
                        </Suspense>
                    </TabErrorBoundary>
                );
            case 'ROI':
                return (
                    <TabErrorBoundary tabName="ROI & Atribuição">
                        <Suspense fallback={<TabSpinner />}>
                            <RevenueTab />
                        </Suspense>
                    </TabErrorBoundary>
                );
            case 'Mensagens':
                return (
                    <TabErrorBoundary tabName="Mensagens">
                        <Suspense fallback={<TabSpinner />}>
                            <AppChat />
                        </Suspense>
                    </TabErrorBoundary>
                );
            case 'Pré-Agendamentos':
                return (
                    <TabErrorBoundary tabName="Pré-Agendamentos">
                        <Suspense fallback={<TabSpinner />}>
                            <PreAgendamentosPage />
                        </Suspense>
                    </TabErrorBoundary>
                );
            case 'Sistema':
                return (
                    <TabErrorBoundary tabName="Sistema">
                        <Suspense fallback={<TabSpinner />}>
                            <SystemUnifiedDashboard />
                        </Suspense>
                    </TabErrorBoundary>
                );
            case 'AmandaMetrics':
                return (
                    <TabErrorBoundary tabName="Amanda AI">
                        <Suspense fallback={<TabSpinner />}>
                            <AmandaMetricsDashboard />
                        </Suspense>
                    </TabErrorBoundary>
                );
            case 'WhatsApp':
                return (
                    <TabErrorBoundary tabName="WhatsApp">
                        <Suspense fallback={<TabSpinner />}>
                            <WhatsAppConnectionCard />
                        </Suspense>
                    </TabErrorBoundary>
                );
            default:
                return <div>Conteúdo não encontrado</div>;
        }
    };

    return (
        <SystemHealthProvider active={activeTab === 'Observability' || activeTab === 'Monitor'}>
        <div className="min-h-screen bg-gray-100 text-gray-800">
            <WhatsAppCriticalBanner />
            <AdminHeader
                activeTab={activeTab}
                openMenu={openMenu}
                adminInfo={adminInfo}
                handleTabChange={handleTabChange}
                toggleMenu={toggleMenu}
                setActiveTab={setActiveTab}
                onLogout={handleLogout}
            />

            <main className="w-full mx-auto px-2 sm:px-4 lg:px-8 py-0 overflow-x-hidden">

                {/* <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {TAB_TITLES[activeTab]}
                    </h2>
                </div> */}

                <div className="bg-white rounded-lg shadow-sm space-y-6 overflow-hidden">
                    {/* 🚀 Dashboard V2 é o conteúdo principal - sem header adicional */}
                    {renderContent()}
                </div>
            </main>


            {/* Modais com Lazy Loading */}
            {isModalOpen && (
                <Suspense fallback={<ModalSkeleton />}>
                    <PatientModal
                        open={isModalOpen}
                        patient={patientToEdit || initialPatientState}
                        isLoading={isLoading}
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
                </Suspense>
            )}

            {showModalAddProfessional && (
                <Suspense fallback={<ModalSkeleton />}>
                    <DoctorFormModal
                        open={showModalAddProfessional}
                        patients={patients}
                        onClose={() => setShowModalAddProfessional(false)}
                        onSubmitDoctor={handleSaveDoctor}
                        loading={isLoading}
                    />
                </Suspense>
            )}

            {paymentModalOpen && (
                <Suspense fallback={<ModalSkeleton />}>
                    <PaymentModal
                        open={paymentModalOpen}
                        patient={paymentContext.patient}
                        doctors={safeDoctorsOverview}
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
                </Suspense>
            )}

            {showAdvancedPayment && (
                <Suspense fallback={<ModalSkeleton />}>
                    <AdvancedPaymentModal
                        open={showAdvancedPayment}
                        patients={patients}
                        doctors={safeDoctorsOverview}
                        onClose={() => setShowAdvancedPayment(false)}
                        onPaymentAdvancedSuccess={handleAdvancedPayment}
                    />
                </Suspense>
            )}
        </div>
        </SystemHealthProvider>
    );
}
