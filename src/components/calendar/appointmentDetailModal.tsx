import { ptBR } from 'date-fns/locale';
import { Building2, Calendar, CheckCircle, ClipboardCheck, Clock, DollarSign, Package, PencilIcon, Plus, Scale, Stethoscope, Tag, Trash2, User, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { validateAppointmentComplete } from '../../utils/appointmentCompleteGuard';
import { extractScheduleConflictMessage } from '../../utils/errorUtils';
import { getPatientFinancialSummary, FinancialSummary } from '../../services/financialSummaryService';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ReactInputMask from 'react-input-mask';
import { buildLocalDateOnly } from '../../utils/dateFormat';
import { useConvenios } from '../../hooks/useConvenios';
import { IDoctor, SelectedEvent } from '../../utils/types/types';
import { mapToUpdateAppointmentDTO } from '../../dtos/appointment.dto';
import { InputCurrency } from '../ui/InputCurrency';
import PatientBalanceModal from '../patients/PatientBalanceModal';
import { Label } from '../ui/Label';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Select } from '../ui/Select';
import API from '../../services/api';
import {
    CalendarPermissions,
    getDefaultPermissions,
} from '../../types/calendarCapabilities';

interface AppointmentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    doctors: IDoctor[];
    event?: SelectedEvent;
    onCancelAppointment: (id: string, reason: string, paymentState?: { paymentMethod?: string; billingType?: string; sessionValue?: number }) => Promise<void>;
    onCompleteAppointment: (id: string, data?: {
        billingType?: string;
        paymentMethod?: string;
        paymentAmount?: number;
        sessionValue?: number;
        insuranceProvider?: string;
        insuranceValue?: number;
        authorizationCode?: string;
        addToBalance?: boolean;
        balanceAmount?: number;
        balanceDescription?: string;
        payments?: Array<{ amount: number; date: string; method: string }>;
    }) => Promise<void>;
    onEditAppointment: (id: string, data: any) => Promise<void>;
    onConfirmAppointment?: (id: string, notes?: string) => Promise<void>;
    patients?: any[];
    onCancelAdvancedSession?: (sessionId: string) => void;
    onConvertPreAgendamento?: (id: string) => Promise<void>;
    onRefreshAppointments?: () => void;
    permissions?: CalendarPermissions;
}

// 🔧 SISTEMA DE TRADUÇÃO DE STATUS
const STATUS_TRANSLATIONS = {
    operational: {
        'scheduled': 'agendado',
        // 'pending' = status inicial do fluxo HYBRID (particular avulsa / pacote pago),
        // equivalente a 'scheduled' em todo o backend — mesmo rótulo visual
        'pending': 'agendado',
        'confirmed': 'confirmado',
        'in_progress': 'em_andamento',
        'completed': 'concluído',
        'canceled': 'cancelado',
        'absent': 'faltou',
        'no_show': 'faltou',
        'pre_agendado': 'pre_agendado'
    },
    clinical: {
        'pending': 'pendente',
        'in_progress': 'em_andamento',
        'completed': 'concluído',
        'cancelled': 'cancelado',
        'no_show': 'faltou'
    },
    payment: {
        'paid': 'pago',
        'package_paid': 'pacote_pago',
        'partial': 'parcial',
        'advanced': 'adiantado',
        'pending': 'pendente',
        'canceled': 'cancelado'
    }
};

// 🔧 CONFIGURAÇÃO VISUAL EM PORTUGUÊS
const STATUS_VISUAL_CONFIG = {
    operational: {
        'agendado': { label: 'Agendado', color: '#3b82f6', icon: Clock },
        'confirmado': { label: 'Confirmado', color: '#10b981', icon: CheckCircle },
        'em_andamento': { label: 'Em Andamento', color: '#f59e0b', icon: Clock },
        'concluído': { label: 'Concluído', color: '#22c55e', icon: CheckCircle },
        'cancelado': { label: 'Cancelado', color: '#6b7280', icon: XCircle },
        'faltou': { label: 'Faltou', color: '#ef4444', icon: XCircle },
        'pre_agendado': { label: 'Pré-Agendado', color: '#ec4899', icon: Clock }
    },
    clinical: {
        'pendente': { label: 'Pendente', color: '#6b7280', icon: Clock },
        'em_andamento': { label: 'Em Andamento', color: '#f59e0b', icon: Clock },
        'concluído': { label: 'Concluído', color: '#22c55e', icon: CheckCircle },
        'cancelado': { label: 'Cancelado', color: '#ef4444', icon: XCircle },
        'faltou': { label: 'Faltou', color: '#ef4444', icon: XCircle }
    }
};

// 🔧 MAPA DE MENSAGENS DE ERRO — traduz códigos do backend em texto claro para a secretária
const ERROR_MESSAGES: Record<string, string> = {
    // Cancelamento
    ALREADY_CANCELED:               'Este agendamento já foi cancelado anteriormente.',
    CANNOT_CANCEL_COMPLETED:        'Não é possível cancelar: a sessão já foi concluída. Se necessário, acione o administrador.',
    ALREADY_PROCESSING:             'Esta operação já está sendo processada. Aguarde alguns instantes e tente novamente.',
    ALREADY_PROCESSING_CANCEL:      'O cancelamento já está em andamento. Aguarde alguns instantes.',
    ALREADY_PROCESSING_COMPLETE:    'A finalização já está em andamento. Aguarde alguns instantes.',
    // Edição
    CANNOT_EDIT_COMPLETED_APPOINTMENT: 'Este atendimento já foi finalizado e não pode mais ser alterado.',
    APPOINTMENT_SLOT_CONFLICT:      'Conflito de horário: já existe um agendamento neste dia/hora. Escolha outro horário.',
    WRITE_CONFLICT:                 'Conflito de atualização simultânea. Os dados foram sincronizados — tente novamente.',
    // Pacote
    PACKAGE_UPDATE_FAILED:          'Sessão salva, mas houve problema ao atualizar o pacote. Avise o administrador.',
    INSUFFICIENT_CREDIT:            'Guia de convênio esgotada: não há mais sessões disponíveis nesta guia.',
    // Acesso
    UNAUTHORIZED:                   'Você não tem permissão para realizar esta ação.',
    NOT_FOUND:                      'Agendamento não encontrado. Ele pode ter sido removido.',
    // Convênio
    NO_ACTIVE_GUIDE:                'Guia de convênio vencida ou esgotada. Cadastre uma nova guia antes de concluir o atendimento.',
    // Genérico
    CONFLICT_STATE:                 'Operação inválida para o estado atual do agendamento.',
    BUSINESS_RULE_VIOLATION:        'Esta ação não é permitida pelas regras do sistema.',
};

const resolveErrorMsg = (err: any, fallback: string): string => {
    const code = err?.response?.data?.code;
    if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
    return err?.response?.data?.error || err?.message || fallback;
};

// 🔧 FUNÇÕES DE TRADUÇÃO
const translateStatus = (status: string | undefined | null, type: 'operational' | 'clinical' | 'payment' = 'operational'): string => {
    if (!status) return '';
    return STATUS_TRANSLATIONS[type]?.[status] || status;
};

const getStatusConfig = (status: string | undefined | null, type: 'operational' | 'clinical' = 'operational') => {
    const translatedStatus = translateStatus(status, type);
    return STATUS_VISUAL_CONFIG[type]?.[translatedStatus] || {
        label: translatedStatus ? translatedStatus.charAt(0).toUpperCase() + translatedStatus.slice(1) : 'Desconhecido',
        color: '#9ca3af',
        icon: Clock
    };
};

// 🏷️ Helper: badges informativos de tipo de atendimento/cobrança na aba confirm
const SERVICE_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    convenio:      { label: 'Convênio',       icon: Stethoscope, color: '#1d4ed8', bg: '#dbeafe' },
    liminar:       { label: 'Liminar',        icon: Scale,       color: '#7e22ce', bg: '#f3e8ff' },
    avaliacao:     { label: 'Avaliação',      icon: ClipboardCheck, color: '#b45309', bg: '#fef3c7' },
    pacote:        { label: 'Pacote Pago',    icon: Package,     color: '#047857', bg: '#d1fae5' },
    sessao_avulsa: { label: 'Sessão Avulsa',  icon: Calendar,    color: '#4b5563', bg: '#f3f4f6' },
};

/**
 * Resolve o billingType exibido pelo modal a partir dos dados brutos do
 * agendamento. Apenas para apresentação: o backend continua sendo a fonte da
 * verdade para billingType (completeSessionService.v2.js::determineBillingType).
 *
 * Regra (espelhando o backend, com uma heurística extra de UI):
 *   1. liminarContract presente                -> 'liminar'   (prioridade 0 do backend)
 *   2. billingType === 'liminar'               -> 'liminar'   (prioridade 3 do backend)
 *   3. billingType === 'convenio'              -> 'convenio'  (prioridade 1 do backend)
 *   4. paymentMethod === 'convenio'            -> 'convenio'  (self-heal do backend)
 *   5. insuranceGuide/plano preenchido         -> 'convenio'  (heurística de UI apenas)
 *   6. fallback: billingType || payment.type   -> 'particular' se não for reconhecido
 */
function resolveBillingType(data: {
    billingType?: string | null;
    paymentMethod?: string | null;
    payment?: { type?: string } | null;
    liminarContract?: any;
    insuranceGuide?: string | null;
    insuranceGuideId?: string | null;
    insurancePlan?: string | null;
    extendedProps?: { insuranceGuide?: any } | null;
}): 'particular' | 'convenio' | 'liminar' {
    const hasInsuranceGuide = !!(
        data.insuranceGuide ||
        data.insuranceGuideId ||
        data.insurancePlan ||
        data.extendedProps?.insuranceGuide
    );

    if (data.liminarContract) return 'liminar';
    if (data.billingType === 'liminar') return 'liminar';
    if (data.billingType === 'convenio') return 'convenio';
    if (data.paymentMethod === 'convenio') return 'convenio';
    if (hasInsuranceGuide) return 'convenio';

    const value = data.billingType ?? data.payment?.type;
    if (value === 'liminar') return 'liminar';
    if (value === 'convenio') return 'convenio';

    return 'particular';
}

/**
 * ⚠️ LEIA ANTES DE MEXER — esse componente já quebrou 3x em regressões (jul/2026)
 * porque a lógica de billingType/status é toda condicional e nada óbvia.
 *
 * 1. TIPO DE COBRANÇA (billingType: 'particular' | 'convenio' | 'liminar')
 *    muda que campos aparecem na aba "Confirmar":
 *      - particular  -> Formas de Pagamento (split de valor/método)
 *      - convenio    -> Select de convênio + Valor Tabela (NÃO entra no caixa
 *                        até faturamento — ver bloco "Atendimento registrado
 *                        com R$ 0,00 no caixa")
 *      - liminar     -> Valor da Sessão Judicial + saldo do processo
 *    Cada bloco é condicional e INDEPENDENTE dos outros — não assuma que
 *    esconder algo para convenio/liminar é seguro para particular (bug de
 *    03/07: `!isPackageSession()` escondeu Formas de Pagamento pra TODO
 *    pacote particular, não só convênio/liminar).
 *
 * 2. STATUS OPERACIONAL controla qual botão aparece na aba "Confirmar"
 *    (ver o switch perto de "FLUXO DE STATUS" mais abaixo):
 *      scheduled/pending/pre_agendado -> "Confirmar Presença" (handleConfirm)
 *      confirmed/missed               -> "Realizar Atendimento" (handleComplete)
 *      completed/canceled             -> nenhum botão (ação já foi feita)
 *    EXCEÇÃO CONVÊNIO (2026-07-06): para convênio, 'Confirmar Presença' e
 *    'Realizar Atendimento' são a mesma coisa financeiramente (o plano paga
 *    depois, no faturamento). Por isso, para convênio o botão sempre é
 *    'Realizar Atendimento' e sempre chama o fluxo de complete (o backend
 *    resolve o roteamento financeiro internamente), independente de estar
 *    scheduled/confirmed/pre_agendado. Isso evita que sessões fiquem presas
 *    no status 'confirmed' sem consumir guia/gerar receita.
 *    Se adicionar um status novo, ele PRECISA cair em um desses 3 grupos,
 *    senão o botão some silenciosamente (bug de 03/07: 'missed' caía no
 *    `return null` do fim, tratado como estado terminal sem correção).
 *
 * 3. O payload enviado no complete usa a chave `splitMethods` (não `payments`)
 *    — o backend (`routes/appointment.v2.js`) só lê `req.body.splitMethods`.
 *    Os valores de método também têm que bater com o enum do schema
 *    (`credit_card`/`debit_card`/`bank_transfer`, não `credito`/`debito`/
 *    `transferencia`) — ver `models/Payment.js` campo `splitMethods`.
 *
 * Antes de esconder/mudar uma condição aqui, teste os 3 billingTypes E os
 * 3 grupos de status — não só o caso que você está corrigindo.
 */
const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
    isOpen,
    onClose,
    doctors,
    event,
    onCancelAppointment,
    onCompleteAppointment,
    onEditAppointment,
    onConfirmAppointment,
    patients = [],
    onCancelAdvancedSession,
    onConvertPreAgendamento,
    onRefreshAppointments,
    permissions: permissionsProp,
}) => {
    const permissions = permissionsProp ?? getDefaultPermissions('admin');
    // 🆕 BUSCAR LISTA DE PROFISSIONAIS do backend quando o modal abrir
    const [allDoctors, setAllDoctors] = useState<IDoctor[]>(doctors || []);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const { convenios, isLoading: loadingConvenios } = useConvenios({ includeInactive: false });

    // 💰 ALERTA DE DÍVIDA: busca financial summary do paciente para mostrar alerta no complete
    const [patientFinancial, setPatientFinancial] = useState<FinancialSummary | null>(null);

    useEffect(() => {
        if (!isOpen || !event?.patient?.id) return;
        getPatientFinancialSummary(event.patient.id)
            .then(setPatientFinancial)
            .catch(() => setPatientFinancial(null));
    }, [isOpen, event?.patient?.id]);
    
    useEffect(() => {
        if (isOpen && (!doctors || doctors.length === 0)) {
            console.log('🔄 [AppointmentDetailModal] Buscando lista de profissionais...');
            setLoadingDoctors(true);
            API.get('/doctors?active=true')
                .then(response => {
                    const docs = response.data?.data || response.data || [];
                    console.log('✅ [AppointmentDetailModal] Profissionais carregados:', docs.length);
                    setAllDoctors(docs.map((d: any) => ({
                        _id: d._id || d.id,
                        fullName: d.fullName || d.name,
                        specialty: d.specialty || ''
                    })));
                })
                .catch(err => {
                    console.error('❌ [AppointmentDetailModal] Erro ao buscar profissionais:', err);
                    toast.warning('Não foi possível carregar a lista de profissionais. Verifique a conexão.', {
                        id: 'doctors-load-error', autoClose: 5000
                    });
                })
                .finally(() => setLoadingDoctors(false));
        } else {
            setAllDoctors(doctors || []);
        }
    }, [isOpen, doctors]);
    
    // Combina a lista com o doctor do agendamento (se não estiver na lista)
    const doctorsList = [...allDoctors];
    if (event?.doctor && !doctorsList.find(d => d._id === event.doctor?.id)) {
        doctorsList.push({
            _id: event.doctor.id,
            fullName: event.doctor.fullName,
            specialty: ''
        } as IDoctor);
    }
    
    const [activeTab, setActiveTab] = useState<'details' | 'confirm' | 'cancel' | 'edit'>('details');

    // 🎯 CAPABILITY: lista de tabs disponíveis baseada nas permissions
    const availableTabs = useMemo(() => {
        const tabs: Array<'details' | 'confirm' | 'cancel' | 'edit'> = ['details'];
        if (permissions.canComplete) tabs.push('confirm');
        if (permissions.canEdit) tabs.push('edit');
        if (permissions.canCancel) tabs.push('cancel');
        return tabs;
    }, [permissions.canComplete, permissions.canEdit, permissions.canCancel]);

    // Se a tab ativa não estiver mais disponível, volta para details
    useEffect(() => {
        if (!availableTabs.includes(activeTab)) {
            setActiveTab('details');
        }
    }, [availableTabs, activeTab]);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelError, setCancelError] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [showDebtConfirm, setShowDebtConfirm] = useState(false);
    const [debtConfirmResolve, setDebtConfirmResolve] = useState<((v: boolean | null) => void) | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [processingState, setProcessingState] = useState<{ isProcessing: boolean; message: string } | null>(null);
    const [confirmedAbsence, setConfirmedAbsence] = useState(false);
    const [editedAppointment, setEditedAppointment] = useState({
        doctorId: '',
        patientId: '',
        date: '',
        time: '',
        reason: '',
        operationalStatus: '',
        clinicalStatus: '',
        serviceType: 'individual_session',
        sessionType: 'fonoaudiologia'
    });

    // 🆕 NOVO: Campos de pagamento e serviço
    const [serviceType, setServiceType] = useState('individual_session');
    const [billingType, setBillingType] = useState<'particular' | 'convenio' | 'liminar'>('particular');
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [insuranceProvider, setInsuranceProvider] = useState('');
    const [insuranceValue, setInsuranceValue] = useState(0);
    const [authorizationCode, setAuthorizationCode] = useState('');
    // 🛡️ Preservar referências de guia/plano ao editar (não excluir nada)
    const [insuranceGuide, setInsuranceGuide] = useState<string | null>(null);
    const [insurancePlan, setInsurancePlan] = useState<string | null>(null);
    const [packageId, setPackageId] = useState<string | null>(null);
    
    // 💰 NOVO: Controle de saldo devedor ao confirmar
    const [addToBalance, setAddToBalance] = useState(false);
    const [debitAmount, setDebitAmount] = useState(0);
    const [debitDescription, setDebitDescription] = useState('');
    const [isAddingDebit, setIsAddingDebit] = useState(false);

    // 💳 FORMAS DE PAGAMENTO múltiplas
    const [payments, setPayments] = useState<Array<{ id: number; amount: number; date: string; method: string }>>([
        { id: 1, amount: 0, date: '', method: '' }
    ]);

    // 🎯 Helper: identifica sessões de pacote pago
    const isPackageSession = useCallback(() => {
        const st = event?.serviceType || event?.sessionType;
        const origin = (event as any).paymentOrigin || (event as any).extendedProps?.paymentOrigin || '';
        return st === 'package_session' || origin === 'package_prepaid' || !!event?.package || !!(event as any).extendedProps?.package || !!(event as any).extendedProps?.__isPackageAppointment;
    }, [event]);

    // 💰 NOVO: Modal de conta corrente
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);

    registerLocale('pt-BR', ptBR);

        // 🚨 CORREÇÃO: Quando a especialidade muda MANUALMENTE, LIMPA o médico se for incompatível
    // NÃO limpa na inicialização do modal (edição de agendamento existente)
    const prevSessionTypeRef = useRef<string>('');
    useEffect(() => {
        // Só executa se o usuário MUDOU a especialidade (não na primeira renderização)
        if (activeTab === 'edit' && editedAppointment.sessionType && editedAppointment.doctorId && prevSessionTypeRef.current && prevSessionTypeRef.current !== editedAppointment.sessionType) {
            const isDoctorCompatible = doctorsList.some(
                d => d._id === editedAppointment.doctorId &&
                (d.specialty?.toLowerCase() === editedAppointment.sessionType.toLowerCase() || !d.specialty)
            );
            if (!isDoctorCompatible) {
                console.log('🚨 [Modal] Médico incompatível com a especialidade, limpando seleção');
                setEditedAppointment(prev => ({ ...prev, doctorId: '' }));
            }
        }
        prevSessionTypeRef.current = editedAppointment.sessionType;
    }, [editedAppointment.sessionType, activeTab, doctorsList]);

    // 🚨 CORREÇÃO: SÓ mostra médicos compatíveis com a especialidade selecionada
    // MAS sempre inclui o médico atualmente selecionado (para edição de agendamentos existentes)
    const compatibleDoctors = doctorsList.filter(d =>
        !editedAppointment.sessionType ||
        !d.specialty ||
        d.specialty?.toLowerCase() === editedAppointment.sessionType.toLowerCase() ||
        d._id === editedAppointment.doctorId  // 👈 SEMPRE inclui o médico atual
    );
    
    
    useEffect(() => {
        if (event) {
            const eventDate = event.date ? new Date(event.date).toLocaleDateString('sv-SE') : '';
            const eventTime = event.time || event.startTime || '';

            // 🔧 TRADUZ OS STATUS AO RECEBER O EVENTO
            const translatedOperationalStatus = translateStatus(event.operationalStatus || 'scheduled', 'operational');
            const translatedClinicalStatus = translateStatus(event.clinicalStatus || 'pending', 'clinical');

            setEditedAppointment({
                doctorId: event.doctor?.id?.toString?.() || event.doctor?._id?.toString?.() || '',
                patientId: event.patient?.id?.toString?.() || event.patient?._id?.toString?.() || '',
                date: eventDate,
                time: eventTime,
                reason: event.reason || event.notes || '',
                operationalStatus: translatedOperationalStatus,
                clinicalStatus: translatedClinicalStatus,
                serviceType: event.serviceType || 'individual_session',
                sessionType: event.specialty || 'fonoaudiologia'
            });

            // 🆕 NOVO: Carregar dados de pagamento do evento
            console.log('[Modal] event aberto — paymentMethod:', event.paymentMethod, '| billingType:', event.billingType, '| event completo:', event);
            setServiceType(event.serviceType || 'individual_session');
            setBillingType(resolveBillingType(event));
            setPaymentAmount(event.sessionValue || event.paymentAmount || 0);
            setPaymentMethod(event.paymentMethod || '');
            setInsuranceProvider(event.insuranceProvider || '');
            setInsuranceValue(event.insuranceValue || 0);
            setAuthorizationCode(event.authorizationCode || '');
            // 🛡️ Preservar referências de guia/plano/pacote ao editar (não excluir nada)
            setInsuranceGuide(event.insuranceGuide ?? event.insuranceGuideId ?? null);
            setInsurancePlan(event.insurancePlan ?? null);
            setPackageId(event.package?._id ?? event.package ?? null);
            
            // 💰 NOVO: Inicializar campos de débito
            setAddToBalance(false);
            setDebitAmount(event.sessionValue || event.paymentAmount || 0);
            setDebitDescription(`Sessão ${event.date ? new Date(event.date).toLocaleDateString('pt-BR') : ''} - ${event.startTime || ''}`);
            setPayments([{
                id: 1,
                amount: event.sessionValue || event.paymentAmount || 0,
                date: new Date().toISOString().split('T')[0],
                method: event.paymentMethod || ''
            }]);
        }
        // ⛔ Depende só de event?.id (não de `event` inteiro): refetches em segundo plano do
        // MESMO agendamento recriam o objeto `event` mas não podem resetar addToBalance/debitAmount/
        // payments enquanto o usuário está preenchendo o registro de saldo devedor no modal aberto.
        // Bug confirmado 2026-07-06: sessões completadas como "pago" em vez de "saldo devedor"
        // porque um refetch da lista de agendamentos zerava o checkbox antes do clique em Concluir.
    }, [event?.id]);

    // 🔄 ATUALIZA DADOS DE PAGAMENTO QUANDO O EVENTO MUDA (inclui atualizações do backend)
    useEffect(() => {
        if (event) {
            // Atualiza apenas se os valores forem diferentes
            if (event.paymentMethod && event.paymentMethod !== paymentMethod) {
                setPaymentMethod(event.paymentMethod);
            }
            const resolved = resolveBillingType(event);
            if (resolved !== billingType) setBillingType(resolved);
            if ((event.sessionValue || event.paymentAmount) && 
                (event.sessionValue !== paymentAmount && event.paymentAmount !== paymentAmount)) {
                setPaymentAmount(event.sessionValue || event.paymentAmount || 0);
            }
            // 🛡️ Preservar referências de guia/plano/pacote ao editar (não excluir nada)
            const nextInsuranceGuide = event.insuranceGuide ?? event.insuranceGuideId ?? null;
            if (nextInsuranceGuide !== insuranceGuide) setInsuranceGuide(nextInsuranceGuide);
            const nextInsurancePlan = event.insurancePlan ?? null;
            if (nextInsurancePlan !== insurancePlan) setInsurancePlan(nextInsurancePlan);
            const nextPackageId = event.package?._id ?? event.package ?? null;
            if (nextPackageId !== packageId) setPackageId(nextPackageId);
        }
    }, [event?.paymentMethod, event?.billingType, event?.sessionValue, event?.paymentAmount, event?.insuranceGuide, event?.insuranceGuideId, event?.insurancePlan, event?.package, event?.liminarContract]);

    // 🔄 RESETA O ESTADO QUANDO O MODAL FECHAR
    useEffect(() => {
        if (!isOpen) {
            setActiveTab('details');
            setCancelReason('');
            setConfirmedAbsence(false);
            setPayments([{ id: 1, amount: 0, date: '', method: '' }]);
        }
    }, [isOpen]);
    
    // 🔄 ESCUTA EVENTO GLOBAL de atualização de dados
    useEffect(() => {
        const handleDataUpdated = async (e: any) => {
            console.log('🔄 [Modal] Evento appointments:data-updated recebido:', e.detail);
            // Força atualização dos dados quando o appointment for atualizado
            if (event && e.detail?.appointmentId === event.id) {
                console.log('🔄 [Modal] Buscando dados atualizados do appointment...');
                try {
                    const response = await API.get(`/api/v2/appointments/${event.id}`);
                    if (response.data?.success && response.data?.data) {
                        const updatedData = response.data.data;
                        console.log('✅ [Modal] Dados atualizados recebidos:', updatedData);
                        
                        // Atualiza campos de pagamento com os dados mais recentes
                        console.log('[Modal] dados atualizados — paymentMethod:', updatedData.paymentMethod, '| payment.method:', updatedData.payment?.method);
                        setPaymentMethod(updatedData.paymentMethod || updatedData.payment?.method || '');
                        setBillingType(resolveBillingType(updatedData));
                        setPaymentAmount(
                            updatedData.sessionValue || 
                            updatedData.payment?.amount || 
                            updatedData.paymentAmount || 0
                        );
                        setInsuranceProvider(updatedData.insuranceProvider || updatedData.convenio?.provider || '');
                        setInsuranceValue(updatedData.insuranceValue || updatedData.convenio?.value || 0);
                        setAuthorizationCode(updatedData.authorizationCode || updatedData.convenio?.authorizationCode || '');
                        // 🛡️ Preservar referências de guia/plano/pacote ao editar (não excluir nada)
                        setInsuranceGuide(updatedData.insuranceGuide ?? updatedData.insuranceGuideId ?? null);
                        setInsurancePlan(updatedData.insurancePlan ?? null);
                        setPackageId(updatedData.package?._id ?? updatedData.package ?? null);
                        
                        // Atualiza o evento localmente também (se possível)
                        setEditedAppointment(prev => ({
                            ...prev,
                            doctorId: updatedData.doctor?._id || prev.doctorId,
                            patientId: updatedData.patient?._id || prev.patientId,
                            date: updatedData.date ? new Date(updatedData.date).toLocaleDateString('sv-SE') : prev.date,
                            time: updatedData.time || prev.time,
                            reason: updatedData.notes || updatedData.reason || prev.reason || '',
                            operationalStatus: translateStatus(updatedData.operationalStatus || prev.operationalStatus || 'scheduled', 'operational'),
                            clinicalStatus: translateStatus(updatedData.clinicalStatus || prev.clinicalStatus || 'pending', 'clinical'),
                            serviceType: updatedData.serviceType || prev.serviceType || 'individual_session',
                            sessionType: updatedData.specialty || updatedData.sessionType || prev.sessionType || 'fonoaudiologia'
                        }));
                    }
                } catch (error) {
                    console.error('❌ [Modal] Erro ao buscar dados atualizados:', error);
                }
            }
        };
        
        window.addEventListener('appointments:data-updated', handleDataUpdated);
        return () => window.removeEventListener('appointments:data-updated', handleDataUpdated);
    }, [event]);

    if (!isOpen || !event) return null;

    // 🔧 FUNÇÃO PARA OBTER CONFIGURAÇÃO VISUAL TRADUZIDA
    const getStatusVisualConfig = (status: string, type: 'operational' | 'clinical' = 'operational') => {
        const config = getStatusConfig(status, type);
        return {
            ...config,
            className: `inline-block px-3 py-2 rounded-lg text-sm font-semibold border`,
            style: {
                backgroundColor: `${config.color}20`,
                color: config.color,
                borderColor: `${config.color}40`
            }
        };
    };

    const handleConfirm = async () => {
        if (!onConfirmAppointment) return;
        console.log(`[AppointmentDetailModal] handleConfirm disparado — appointmentId=${event?.id}, operationalStatus=${event?.operationalStatus}, billingType=${event?.billingType}, endpoint=/confirm`);
        setIsConfirming(true);
        try {
            await onConfirmAppointment(event?.id);
            setActiveTab('details');
        } catch (err: any) {
            console.error('❌ [Modal] Erro ao confirmar presença:', err);
            const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Erro ao confirmar presença';
            toast.error(errMsg, { id: `confirm-error-${event?.id}` });
        } finally {
            setIsConfirming(false);
        }
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) {
            toast.error('Informe o motivo do cancelamento antes de prosseguir.');
            return;
        }

        setCancelError('');
        console.log('❌ [Modal] Cancelando agendamento ID:', event?.id);
        setIsCancelling(true);
        try {
            await onCancelAppointment(event.id, cancelReason, { paymentMethod, billingType, sessionValue: paymentAmount });
            setCancelReason('');
            setActiveTab('details');
        } catch (err: any) {
            console.error('❌ [Modal] Erro ao cancelar:', err);
            const errorMsg = resolveErrorMsg(err, 'Erro ao cancelar agendamento. Tente novamente.');
            setCancelError(errorMsg);
            toast.error(errorMsg, { id: `cancel-error-${event.id}`, autoClose: 7000 });
        } finally {
            setIsCancelling(false);
        }
    };

    const handleComplete = async () => {
        console.log(`[AppointmentDetailModal] handleComplete disparado — appointmentId=${event?.id}, operationalStatus=${event?.operationalStatus}, billingType=${event?.billingType}, endpoint=service-resolved`);
        
        // 🛡️ PROTEÇÃO: Evita bater no 409 desnecessariamente
        if (event?.extendedProps?.operationalStatus === 'processing_complete') {
            toast.warning('Este atendimento já está sendo processado. Aguarde...', {
                id: `processing-${event.id}`
            });
            return;
        }

        // 🚫 BLOQUEIO: método de pagamento obrigatório para particular (exceto pacote pago)
        if (billingType === 'particular' && !isPackageSession() && !paymentMethod) {
            toast.error('Selecione o método de pagamento antes de concluir o atendimento.');
            return;
        }

        // 💰 ALERTA DE DÍVIDA: só para particular — convenio/liminar são pós-pagos pelo plano/judicial
        // Checa múltiplos campos: billingType pode estar errado no DB (data quality issue)
        const isThirdPartyBilling = (
            ['convenio', 'liminar'].includes(event?.billingType ?? '') ||
            ['convenio', 'liminar'].includes(billingType) ||
            event?.paymentMethod === 'convenio' ||
            event?.paymentMethod === 'liminar_credit' ||
            !!(event?.insuranceProvider) ||
            !!(event?.extendedProps?.insuranceProvider) ||
            event?.extendedProps?.billingType === 'convenio' ||
            isPackageSession()
        );
        if (patientFinancial && patientFinancial.sessionDebt > 0 && !isThirdPartyBilling) {
            const confirmed = await new Promise<boolean | null>(resolve => {
                setDebtConfirmResolve(() => resolve);
                setShowDebtConfirm(true);
            });
            if (confirmed === null) return;
            if (!confirmed) {
                setIsBalanceModalOpen(true);
                return;
            }
        }

        setIsCompleting(true);
        setProcessingState({ isProcessing: true, message: 'Finalizando atendimento...' });
        console.log('[Modal] ▶ handleComplete START — isCompleting=true, processingState SET');

        try {
            // 🛡️ GUARD FINANCEIRO — valida antes de bater na API
            const guardResult = validateAppointmentComplete({
                billingType: event?.billingType,
                serviceType: event?.serviceType ?? event?.extendedProps?.serviceType,
                package: event?.package
                    ?? event?.extendedProps?.package
                    ?? ((event?.extendedProps?.__isPackageAppointment || event?.extendedProps?.serviceType === 'package_session' || event?.extendedProps?.packageId)
                        ? { _id: event?.extendedProps?.packageId || 'legacy' }
                        : null),
                liminarContract: event?.liminarContract,
                sessionValue: (addToBalance && debitAmount > 0) ? debitAmount : (getTotalPaid() > 0 ? getTotalPaid() : (event?.sessionValue ?? event?.paymentAmount ?? null)),
            });

            console.log('[Modal] Guard result:', guardResult);
            if (!guardResult.valid) {
                toast.error(guardResult.message, { id: `guard-${event.id}`, autoClose: 6000 });
                return;
            }

            // ✅ Guard passou — executa com loading ativo
            console.log('[Modal] Guard OK — chamando onCompleteAppointment');

            // Monta o array de pagamentos (apenas particular com dados válidos)
            const paymentsPayload = !isThirdPartyBilling
                ? payments
                    .filter(p => Number(p.amount) > 0 && p.method && p.date)
                    .map(p => ({ amount: Number(p.amount), date: p.date, method: p.method }))
                : undefined;

            // Metadados de billing consolidados no complete (Opção A — sem PUT silencioso separado)
            const billingMeta = {
                billingType,
                paymentMethod: billingType === 'particular'
                    ? (paymentsPayload?.[0]?.method || paymentMethod)
                    : billingType === 'liminar' ? 'liminar_credit'
                    : 'convenio',
                paymentAmount: billingType === 'particular'
                    ? (paymentsPayload?.reduce((s, p) => s + p.amount, 0) || paymentAmount)
                    : billingType === 'liminar' ? paymentAmount
                    : insuranceValue,
                sessionValue: billingType === 'particular'
                    ? (paymentsPayload?.reduce((s, p) => s + p.amount, 0) || paymentAmount)
                    : billingType === 'liminar' ? paymentAmount
                    : insuranceValue,
                ...(billingType === 'convenio' && { insuranceProvider, insuranceValue, authorizationCode }),
            };

            if (addToBalance) {
                console.log('💰 [Modal] Completando com saldo devedor:', debitAmount);
                await onCompleteAppointment(event.id, {
                    ...billingMeta,
                    addToBalance: true,
                    balanceAmount: debitAmount,
                    balanceDescription: debitDescription,
                    ...(paymentsPayload?.length ? { splitMethods: paymentsPayload } : {})
                });
            } else {
                await onCompleteAppointment(event.id, {
                    ...billingMeta,
                    ...(paymentsPayload?.length ? { splitMethods: paymentsPayload } : {})
                });
            }
            console.log('[Modal] onCompleteAppointment RETORNOU — sucesso, aguardando finally');
            // ✅ Sucesso: o modal fecha via closeModalSignal do pai
        } catch (err: any) {
            console.error('❌ [Modal] Erro ao completar:', err);
            const code = err?.response?.data?.code;
            const errorMsg = resolveErrorMsg(err, 'Erro ao finalizar sessão. Tente novamente.');
            toast.error(errorMsg, { id: `complete-error-${event.id}`, autoClose: 7000 });
            if (code === 'ALREADY_PROCESSING' || code === 'ALREADY_PROCESSING_COMPLETE') {
                toast.info('Feche o modal, aguarde alguns segundos e tente novamente.', {
                    id: `complete-info-${event.id}`, autoClose: 6000
                });
            }
            if (code === 'PACKAGE_UPDATE_FAILED') {
                toast.warning('A sessão foi concluída, mas houve problema no pacote. Avise o administrador.', {
                    id: `pkg-warn-${event.id}`, autoClose: false
                });
            }
            // NÃO fecha o modal — secretária precisa ver o erro
        } finally {
            console.log('[Modal] ■ finally — zerando isCompleting e processingState');
            setIsCompleting(false);
            setProcessingState(null);
        }
    };

    const handleConvert = async () => {
        if (!onConvertPreAgendamento) {
            toast.warning('Funcionalidade de conversão não disponível. Contate o administrador.');
            return;
        }
        setIsConverting(true);
        try {
            await onConvertPreAgendamento(event.id);
        } catch (err: any) {
            console.error('❌ [Modal] Erro ao converter pré-agendamento:', err);
            const errorMsg = resolveErrorMsg(err, 'Erro ao converter pré-agendamento. Tente novamente.');
            toast.error(errorMsg, { id: `convert-error-${event.id}`, autoClose: 7000 });
        } finally {
            setIsConverting(false);
        }
    };

    const handleEdit = async () => {
        if (!editedAppointment.date || !editedAppointment.time) {
            toast.error('Preencha a data e o horário antes de salvar.');
            return;
        }
        if (billingType === 'particular' && !isPackageSession() && !paymentMethod) {
            toast.error('Selecione o método de pagamento antes de salvar.');
            return;
        }

        setIsEditing(true);
        setProcessingState({ isProcessing: true, message: 'Atualizando agendamento...' });
        
        try {
            // 🔧 TRADUZ OS STATUS DE VOLTA PARA INGLÊS ANTES DE ENVIAR PARA API
            const operationalStatusEN = Object.keys(STATUS_TRANSLATIONS.operational).find(
                key => STATUS_TRANSLATIONS.operational[key] === editedAppointment.operationalStatus
            ) || editedAppointment.operationalStatus;

            const clinicalStatusEN = Object.keys(STATUS_TRANSLATIONS.clinical).find(
                key => STATUS_TRANSLATIONS.clinical[key] === editedAppointment.clinicalStatus
            ) || editedAppointment.clinicalStatus;

            // ✅ V2 ATIVO: Edit de agendamento NÃO envia paymentAmount/sessionValue.
            // O valor financeiro é decidido pelo backend (handler no complete).
            // Se precisar alterar valor, use o fluxo financeiro (modal de pagamento).
            // 🛡️ Resolve paymentMethod respeitando a origem real (liminar também precisa ser preservada)
            const resolvedPaymentMethod = billingType === 'particular'
                ? paymentMethod
                : billingType === 'liminar'
                    ? (paymentMethod || 'liminar_credit')
                    : (paymentMethod || 'convenio');

            const appointmentData = mapToUpdateAppointmentDTO({
                doctorId: editedAppointment.doctorId,
                patientId: editedAppointment.patientId,
                date: editedAppointment.date,
                time: editedAppointment.time,
                notes: editedAppointment.reason,
                operationalStatus: operationalStatusEN,
                clinicalStatus: clinicalStatusEN === 'scheduled' ? 'pending' : clinicalStatusEN,
                serviceType,
                sessionType: editedAppointment.sessionType,
                specialty: editedAppointment.sessionType,
                billingType,
                paymentAmount,
                sessionValue: paymentAmount,
                paymentMethod: resolvedPaymentMethod,
                insuranceProvider,
                insuranceValue,
                authorizationCode,
                // 🛡️ Preservar referências de guia/plano/pacote ao editar (não excluir nada)
                insuranceGuide,
                insurancePlan,
                packageId,
                insurance: billingType === 'convenio' && insuranceProvider ? {
                    provider: insuranceProvider,
                    grossAmount: insuranceValue || 0,
                    authorizationCode: authorizationCode || null,
                    status: 'pending_billing'
                } : undefined
            });

            // 🎯 STATUS ESPECIAIS: redireciona para o handler correto (PATCH /complete ou PATCH /cancel)
            // PUT /update não executa completeSessionV2 — só PATCH /complete sincroniza tudo
            // Se o appointment JÁ estava completed, deixa ir para PUT → admin-edit (não re-completa)
            const originalStatus = event?.operationalStatus;
            if (operationalStatusEN === 'completed' && originalStatus !== 'completed') {
                setIsEditing(false);
                setProcessingState({ isProcessing: false, message: '' });
                await handleComplete();
                return;
            }

            // 🚨 CANCELADO: o select de status não pode apenas mudar de aba.
            // O usuário espera que "Salvar" persista o cancelamento.
            // Primeiro salva os demais campos editados, depois executa o cancelamento.
            if (operationalStatusEN === 'canceled') {
                await onEditAppointment(event.id, appointmentData);
                await onCancelAppointment(
                    event.id,
                    'Cancelado via edição de status',
                    { paymentMethod, billingType, sessionValue: paymentAmount }
                );
                onClose?.();
                return;
            }

            await onEditAppointment(event.id, appointmentData);
        } catch (err: any) {
            console.error('❌ [Modal] Erro ao editar:', err);

            // 🎯 Mensagem detalhada para conflitos de agenda (horário já ocupado)
            const conflictMsg = extractScheduleConflictMessage(err);
            if (conflictMsg) {
                toast.error((t) => (
                    <div className="flex flex-col gap-1">
                        <div className="font-semibold text-sm">⚠️ Conflito de agenda</div>
                        <div className="text-sm leading-snug">{conflictMsg}</div>
                    </div>
                ), {
                    id: `edit-conflict-${event.id}`,
                    autoClose: 8000,
                    style: { maxWidth: '420px', borderLeft: '4px solid #ef4444' }
                });
            } else {
                const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Erro ao atualizar agendamento';
                toast.error(errMsg, { id: `edit-error-${event.id}` });
            }
            throw err;
        } finally {
            setIsEditing(false);
            setProcessingState(null);
        }
    };

    const handleFieldChange = (field: string, value: string) => {
        setEditedAppointment(prev => ({ ...prev, [field]: value }));
    };

    const addPayment = () => {
        setPayments(prev => [...prev, { id: Date.now(), amount: 0, date: '', method: '' }]);
    };
    const removePayment = (id: number) => {
        if (payments.length > 1) setPayments(prev => prev.filter(p => p.id !== id));
    };
    const updatePayment = (id: number, field: string, value: any) => {
        setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };
    const getTotalPaid = () => payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const handleCancelAdvancedSession = (sessionId: string) => {
        if (onCancelAdvancedSession) {
            onCancelAdvancedSession(sessionId);
        }
    };

    // 🔧 TRADUZ OS STATUS DO EVENTO PARA EXIBIÇÃO
    const translatedEvent = event ? {
        ...event,
        operationalStatus: translateStatus(event.operationalStatus, 'operational'),
        clinicalStatus: translateStatus(event.clinicalStatus, 'clinical')
    } : null;

    // 🏷️ Badges informativos de tipo de atendimento/cobrança (aba confirm)
    const getServiceTypeBadges = () => {
        if (!event) return [];
        const st = (event.serviceType || event.sessionType || 'individual_session') as string;
        const bt = event.billingType as string;
        const pm = event.paymentMethod as string;
        const origin = (event as any).paymentOrigin || (event as any).extendedProps?.paymentOrigin || '';
        const hasPackage = !!(event.package || (event as any).extendedProps?.package || (event as any).extendedProps?.packageId);
        const hasInsuranceGuide = !!(event.insuranceGuide || (event as any).insuranceGuideId || (event as any).extendedProps?.insuranceGuide);

        const badges: Array<{ key: string; label: string; icon: any; color: string; bg: string }> = [];

        if (bt === 'convenio' || pm === 'convenio' || event.insuranceProvider || hasInsuranceGuide) {
            badges.push({ key: 'convenio', ...SERVICE_TYPE_CONFIG.convenio });
        }
        if (bt === 'liminar' || pm === 'liminar_credit' || event.liminarContract) {
            badges.push({ key: 'liminar', ...SERVICE_TYPE_CONFIG.liminar });
        }
        if (['evaluation', 're_evaluation', 'neuropsych_evaluation'].includes(st)) {
            badges.push({ key: 'avaliacao', ...SERVICE_TYPE_CONFIG.avaliacao });
        }
        if (st === 'package_session' || origin === 'package_prepaid' || hasPackage) {
            badges.push({ key: 'pacote', ...SERVICE_TYPE_CONFIG.pacote });
        }
        if (['session', 'individual_session'].includes(st) && !hasPackage && bt !== 'convenio' && bt !== 'liminar') {
            badges.push({ key: 'sessao_avulsa', ...SERVICE_TYPE_CONFIG.sessao_avulsa });
        }

        return badges;
    };

    const renderTabContent = () => {
        if (!translatedEvent) return null;

        switch (activeTab) {
            case 'details':
                return (
                    <div className="space-y-6">
                        {/* 🔔 AVISO DE PRÉ-AGENDAMENTO */}
                        {event?.__isPreAgendamento && (
                            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <ClipboardCheck className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-orange-800">Pré-Agendamento (Interesse)</p>
                                    <p className="text-sm text-orange-600">Este é um interesse ainda não convertido em agendamento real. Converta-o primeiro para poder confirmar/cancelar.</p>
                                </div>
                            </div>
                        )}
                        
                        {permissions.canSeeFinancial && (
                            <>
                                {/* 🚨 ALERTA: Sessão de pacote ainda sem pagamento */}
                                {(event?.extendedProps?.__isPackageAppointment || event?.extendedProps?.serviceType === 'package_session') && !event?.extendedProps?.__hasPayment && (
                                    <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                                        <DollarSign className="w-4 h-4 text-amber-600" />
                                        <span className="font-medium text-sm text-amber-800">
                                            💳 Sessão do pacote ainda não paga. O pagamento pode ser registrado ao concluir ou manualmente.
                                        </span>
                                    </div>
                                )}

                                {event?.extendedProps?.paymentStatus && (
                                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${event.extendedProps.paymentStatus === 'paid' || event.extendedProps.paymentStatus === 'package_paid'
                                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100'
                                        : event.extendedProps.paymentStatus === 'partial'
                                            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-100'
                                            : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-100'
                                    }`}>
                                        <DollarSign className={`w-4 h-4 ${event.extendedProps.paymentStatus === 'paid' || event.extendedProps.paymentStatus === 'package_paid'
                                            ? 'text-green-600'
                                            : event.extendedProps.paymentStatus === 'partial'
                                                ? 'text-yellow-600'
                                                : 'text-red-600'
                                        }`} />
                                        <span className="font-medium text-sm text-gray-700">Status Financeiro:</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${event.extendedProps.paymentStatus === 'paid' || event.extendedProps.paymentStatus === 'package_paid'
                                            ? 'bg-green-100 text-green-800 border border-green-200'
                                            : event.extendedProps.paymentStatus === 'partial'
                                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                                : 'bg-red-100 text-red-800 border border-red-200'
                                            }`}>
                                            {translateStatus(event.extendedProps.paymentStatus, 'payment')}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                        
                        {/* 💰 ALERTA DE SALDO DEVEDOR DO PACIENTE */}
                        {permissions.canSeeDebt && patientFinancial && patientFinancial.sessionDebt > 0 ? (
                            <button
                                onClick={() => setIsBalanceModalOpen(true)}
                                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border-2 border-red-300 hover:border-red-400 hover:shadow-md transition-all text-left"
                            >
                                <div className="p-2 bg-red-100 rounded-lg shrink-0">
                                    <DollarSign className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-red-800">⚠️ Paciente com Saldo Devedor</p>
                                    <p className="text-sm text-red-600">
                                        Clique para ver e quitar — <span className="font-bold text-red-700">R$ {patientFinancial.sessionDebt.toFixed(2).replace('.', ',')}</span> em aberto
                                    </p>
                                </div>
                                <span className="text-xl font-bold text-red-600 shrink-0">
                                    R$ {patientFinancial.sessionDebt.toFixed(2).replace('.', ',')}
                                </span>
                            </button>
                        ) : permissions.canSeeDebt && event?.patient?.id && (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setIsBalanceModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
                                >
                                    <DollarSign size={18} />
                                    <span>Ver Conta Corrente</span>
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <User className="w-4 h-4 text-green-600" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-700">Paciente</h3>
                                </div>
                                <p className="text-lg font-semibold text-gray-900">{translatedEvent.patient?.fullName || 'Não informado'}</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Stethoscope className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-700">Profissional</h3>
                                </div>
                                <p className="text-lg font-semibold text-gray-900">{translatedEvent.doctor?.fullName || 'Não informado'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Calendar className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-700">Data e Hora</h3>
                                </div>
                                <p className="text-lg font-semibold text-gray-900">{translatedEvent.formattedDate}</p>
                            </div>

                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-amber-100 rounded-lg">
                                        <Clock className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-700">Status Operacional</h3>
                                </div>
                                <span {...getStatusVisualConfig(translatedEvent.operationalStatus, 'operational')}>
                                    {getStatusConfig(translatedEvent.operationalStatus, 'operational').label}
                                </span>
                            </div>

                            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-teal-100 rounded-lg">
                                        <ClipboardCheck className="w-4 h-4 text-teal-600" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-700">Status Clínico</h3>
                                </div>
                                <span {...getStatusVisualConfig(translatedEvent.clinicalStatus, 'clinical')}>
                                    {getStatusConfig(translatedEvent.clinicalStatus, 'clinical').label}
                                </span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200">
                            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <ClipboardCheck className="w-4 h-4 text-gray-600" />
                                Motivo da Consulta
                            </h3>
                            <p className="text-gray-800">{translatedEvent.reason || 'Não informado'}</p>
                        </div>

                        {event.advancedSessions?.length > 0 && (
                            <div className="mt-6 border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-green-600" />
                                    Sessões Futuras Pagas
                                </h3>

                                <div className="space-y-3">
                                    {event.advancedSessions.map((session, index) => (
                                        <div
                                            key={session._id || index}
                                            className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200"
                                        >
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-800">
                                                    {session.formattedDate} às {session.formattedTime}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {session.specialty} • {session.doctor?.fullName}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-medium px-3 py-1 rounded-full ${session.operationalStatus === 'scheduled'
                                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                    }`}>
                                                    {session.operationalStatus === 'scheduled' ? 'Pago' : 'Utilizado'}
                                                </span>

                                                {session.operationalStatus === 'scheduled' && onCancelAdvancedSession && (
                                                    <button
                                                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        onClick={() => handleCancelAdvancedSession(session._id)}
                                                        title="Cancelar sessão"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {event.payment && (
                                    <div className="mt-4 text-sm text-gray-500 bg-white p-3 rounded-lg border border-gray-200">
                                        Pagamento realizado em: {new Date(event.payment.createdAt).toLocaleDateString('pt-BR')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

            case 'confirm':
                return (
                    <div className="space-y-5">
                        {/* Alerta dinâmico baseado no status e billingType */}
                        {(() => {
                            const opStatus = event?.operationalStatus;
                            const isConvenio = event?.billingType === 'convenio' || event?.paymentMethod === 'convenio' || !!event?.insuranceProvider;
                            const willComplete = isConvenio || opStatus === 'confirmed' || opStatus === 'missed';

                            return (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 p-3 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-sm text-green-800 font-medium">
                                                {willComplete
                                                    ? 'Confirme os detalhes antes de concluir o atendimento.'
                                                    : 'Confirme os detalhes antes de confirmar a presença.'}
                                            </p>
                                            <p className="text-xs text-green-600 mt-0.5">
                                                {willComplete
                                                    ? 'Esta ação marcará a consulta como concluída e executará a cobrança/faturamento.'
                                                    : 'Esta ação marcará a presença do paciente como confirmada. Para concluir o atendimento, clique em "Realizar Atendimento" depois.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Informações do agendamento — mesmo padrão da aba Detalhes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-xl border border-green-100">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="p-1.5 bg-green-100 rounded-lg">
                                        <User className="w-4 h-4 text-green-600" />
                                    </div>
                                    <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Paciente</h3>
                                </div>
                                <p className="text-base font-semibold text-gray-900">{translatedEvent.patient?.fullName || 'Não informado'}</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="p-1.5 bg-blue-100 rounded-lg">
                                        <Stethoscope className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Profissional</h3>
                                </div>
                                <p className="text-base font-semibold text-gray-900">{translatedEvent.doctor?.fullName || 'Não informado'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-3 rounded-xl border border-purple-100">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="p-1.5 bg-purple-100 rounded-lg">
                                        <Calendar className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Data e Hora</h3>
                                </div>
                                <p className="text-base font-semibold text-gray-900">{translatedEvent.formattedDate}</p>
                            </div>

                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-xl border border-amber-100">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="p-1.5 bg-amber-100 rounded-lg">
                                        <Clock className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Status Operacional</h3>
                                </div>
                                <span {...getStatusVisualConfig(translatedEvent.operationalStatus, 'operational')}>
                                    {getStatusConfig(translatedEvent.operationalStatus, 'operational').label}
                                </span>
                            </div>

                            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-3 rounded-xl border border-teal-100">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="p-1.5 bg-teal-100 rounded-lg">
                                        <ClipboardCheck className="w-4 h-4 text-teal-600" />
                                    </div>
                                    <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Status Clínico</h3>
                                </div>
                                <span {...getStatusVisualConfig(translatedEvent.clinicalStatus, 'clinical')}>
                                    {getStatusConfig(translatedEvent.clinicalStatus, 'clinical').label}
                                </span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-3 rounded-xl border border-gray-200">
                            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-2">
                                <ClipboardCheck className="w-4 h-4 text-gray-600" />
                                Motivo da Consulta
                            </h3>
                            <p className="text-sm text-gray-800">{translatedEvent.reason || 'Não informado'}</p>
                        </div>

                        {/* 🏷️ TIPO DE ATENDIMENTO — badges informativos */}
                        {getServiceTypeBadges().length > 0 && (
                            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-gray-200 p-3">
                                <div className="flex items-center gap-1.5 mb-2.5">
                                    <Tag className="w-3.5 h-3.5 text-gray-500" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo de atendimento</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {getServiceTypeBadges().map((badge) => {
                                        const Icon = badge.icon;
                                        return (
                                            <span
                                                key={badge.key}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                                                style={{ backgroundColor: badge.bg, color: badge.color }}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                {badge.label}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 🏦 TIPO DE COBRANÇA */}
                        {permissions.canSeeFinancial && (
                            <div className="bg-white rounded-xl border border-gray-200 p-3">
                                <div className="flex items-center gap-1.5 mb-3">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cobrança</span>
                                </div>
                                <div className="bg-gray-50 rounded-lg border border-gray-200 p-1 flex gap-1 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setBillingType('particular')}
                                        className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                            billingType === 'particular'
                                                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Particular
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBillingType('convenio')}
                                        className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                            billingType === 'convenio'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Convênio
                                    </button>
                                    {(event?.billingType === 'liminar' || !!event?.liminarContract) && (
                                        <button
                                            type="button"
                                            onClick={() => setBillingType('liminar')}
                                            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                                billingType === 'liminar'
                                                    ? 'bg-purple-600 text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            Liminar
                                        </button>
                                    )}
                                </div>

                                {billingType === 'liminar' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Valor da Sessão Judicial *
                                            </label>
                                            <InputCurrency
                                                name="paymentAmount"
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                                className="w-full p-2 bg-white border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                        {event?.liminarContract && (
                                            <div className="bg-purple-50 p-2.5 rounded-lg text-xs text-purple-800">
                                                ⚖️ Saldo judicial disponível: R$ {((event.liminarContract as any).creditBalance ?? 0).toFixed(2)}
                                                {(event.liminarContract as any).processNumber && ` — Processo: ${(event.liminarContract as any).processNumber}`}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {billingType === 'convenio' && (
                                    <div className="space-y-3">
                                        {!insuranceProvider && (
                                            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs text-amber-800">
                                                ⚠️ <strong>Convênio não identificado.</strong> Selecione o convênio abaixo antes de confirmar.
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Convênio *
                                                </label>
                                                <Select
                                                    value={insuranceProvider}
                                                    onChange={(e) => {
                                                        const selectedCode = e.target.value;
                                                        const provider = convenios.find(c => c.code === selectedCode);
                                                        setInsuranceProvider(selectedCode);
                                                        setInsuranceValue(provider?.sessionValue || 0);
                                                    }}
                                                    disabled={loadingConvenios}
                                                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm"
                                                >
                                                    <option value="">{loadingConvenios ? 'Carregando...' : 'Selecione'}</option>
                                                    {convenios.map(p => (
                                                        <option key={p._id} value={p.code}>
                                                            {p.name}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Valor Tabela</label>
                                                <InputCurrency
                                                    name="insuranceValue"
                                                    value={insuranceValue}
                                                    onChange={(e) => setInsuranceValue(Number(e.target.value))}
                                                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="bg-blue-50 p-2 rounded-lg text-xs text-blue-700">
                                            💡 Atendimento registrado com R$ 0,00 no caixa. O valor entra após confirmação do convênio.
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 💳 FORMAS DE PAGAMENTO — oculta para convênio/liminar (ver doc no topo do arquivo).
                            NÃO adicionar exclusão por pacote/serviceType aqui de novo — sessão de pacote
                            particular também precisa dessa seção (bug corrigido 03/07: !isPackageSession()
                            escondia isso pra TODO pacote, não só convênio/liminar). */}
                        {permissions.canSeeFinancial && !(
                            ['convenio', 'liminar'].includes(event?.billingType ?? '') ||
                            ['convenio', 'liminar'].includes(billingType) ||
                            event?.paymentMethod === 'convenio' ||
                            event?.paymentMethod === 'liminar_credit' ||
                            !!(event?.insuranceProvider) ||
                            !!(insuranceProvider)
                        ) && (
                            <div className="bg-white rounded-xl border border-gray-200 p-3">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                        Formas de Pagamento
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addPayment}
                                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Adicionar
                                    </button>
                                </div>

                                {payments.map((payment, index) => (
                                    <div key={payment.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2 last:mb-0">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium text-gray-600">Pagamento {index + 1}</span>
                                            {payments.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removePayment(payment.id)}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$) *</label>
                                                <InputCurrency
                                                    name={`payment-amount-${payment.id}`}
                                                    value={payment.amount}
                                                    onChange={(e) => updatePayment(payment.id, 'amount', e.target.value)}
                                                    className="w-full p-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
                                                <DatePicker
                                                    selected={payment.date ? buildLocalDateOnly(payment.date) : null}
                                                    onChange={(date: Date | null) => {
                                                        if (!date) return;
                                                        updatePayment(payment.id, 'date', date.toISOString().split('T')[0]);
                                                    }}
                                                    customInput={
                                                        <ReactInputMask
                                                            mask="99/99/9999"
                                                            className="w-full p-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                                        />
                                                    }
                                                    placeholderText="dd/MM/yyyy"
                                                    dateFormat="dd/MM/yyyy"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Método de Pagamento *</label>
                                                <select
                                                    value={payment.method}
                                                    onChange={(e) => updatePayment(payment.id, 'method', e.target.value)}
                                                    className="w-full p-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                                >
                                                    <option value="">Escolha um método</option>
                                                    <option value="dinheiro">Dinheiro</option>
                                                    <option value="pix">PIX</option>
                                                    <option value="credit_card">Cartão de Crédito</option>
                                                    <option value="debit_card">Cartão de Débito</option>
                                                    <option value="bank_transfer">Transferência</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {payments.length > 1 && (
                                    <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200 mt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-blue-800">Total:</span>
                                            <span className="text-sm font-bold text-blue-800">
                                                R$ {getTotalPaid().toFixed(2).replace('.', ',')}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 💰 SEÇÃO DE SALDO DEVEDOR — oculta para convênio/liminar e sem permission */}
                        {permissions.canSeeDebt && !(
                            ['convenio', 'liminar'].includes(event?.billingType ?? '') ||
                            ['convenio', 'liminar'].includes(billingType) ||
                            event?.paymentMethod === 'convenio' ||
                            event?.paymentMethod === 'liminar_credit' ||
                            !!(event?.insuranceProvider) ||
                            !!(insuranceProvider)
                        ) && (
                            <div className="bg-white rounded-xl border border-gray-200 p-3">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 bg-amber-100 rounded-lg">
                                        <DollarSign className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conta Corrente do Paciente</h3>
                                        <p className="text-xs text-gray-500">Registre se o paciente usará a sessão mas pagará depois</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center p-2.5 bg-gray-50 rounded-lg border border-gray-200 mb-3">
                                    <input
                                        id="add-to-balance"
                                        type="checkbox"
                                        className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded cursor-pointer"
                                        checked={addToBalance}
                                        onChange={(e) => setAddToBalance(e.target.checked)}
                                    />
                                    <label htmlFor="add-to-balance" className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer">
                                        <span className="font-semibold text-amber-700">Adicionar ao Saldo Devedor</span>
                                        <span className="block text-xs text-gray-500">Paciente usará a sessão agora e pagará posteriormente</span>
                                    </label>
                                </div>
                                
                                {addToBalance && (
                                    <div className="space-y-3 animate-fadeIn">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Valor a Registrar (R$)
                                                </label>
                                                <InputCurrency
                                                    name="debitAmount"
                                                    value={debitAmount}
                                                    onChange={(e) => setDebitAmount(Number(e.target.value))}
                                                    className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Descrição
                                                </label>
                                                <input
                                                    type="text"
                                                    value={debitDescription}
                                                    onChange={(e) => setDebitDescription(e.target.value)}
                                                    className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                                    placeholder="Ex: Sessão 19/02/2026"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="p-2.5 bg-amber-50 rounded-lg text-xs text-amber-800">
                                            <p className="font-semibold">⚠️ Atenção</p>
                                            <p>Ao confirmar, o agendamento será marcado como concluído e <strong>R$ {debitAmount.toFixed(2)}</strong> será adicionado ao saldo devedor do paciente.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

            case 'cancel':
                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-400 p-4 rounded-xl">
                            <div className="flex items-start gap-3">
                                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-red-800 font-medium">
                                        Ao cancelar este agendamento, o paciente será notificado automaticamente.
                                    </p>
                                    <p className="text-xs text-red-600 mt-1">
                                        Esta ação não poderá ser desfeita.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {cancelError && (
                            <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{cancelError}</span>
                            </div>
                        )}

                        <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-600" />
                                Motivo do cancelamento *
                            </label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => { setCancelReason(e.target.value); setCancelError(''); }}
                                rows={4}
                                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                placeholder="Descreva o motivo do cancelamento..."
                            />
                            <p className="mt-2 text-sm text-gray-500">Este motivo será enviado ao paciente</p>
                        </div>

                        <div className="flex items-center p-4 bg-green-50 rounded-xl border border-green-200">
                            <input
                                id="notify-patient"
                                name="notify-patient"
                                type="checkbox"
                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                checked={confirmedAbsence}
                                onChange={(e) => setConfirmedAbsence(e.target.checked)}
                            />
                            <label htmlFor="notify-patient" className="ml-3 block text-sm text-gray-700">
                                Notificar paciente por WhatsApp
                            </label>
                        </div>
                    </div>
                );

            case 'edit':
                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-4 rounded-xl">
                            <div className="flex items-start gap-3">
                                <PencilIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-amber-800 font-medium">
                                        Edite os detalhes deste agendamento.
                                    </p>
                                    <p className="text-xs text-amber-600 mt-1">
                                        As alterações serão salvas imediatamente.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <User className="w-4 h-4 text-green-600" />
                                    Paciente <span className="text-red-500">(não pode ser alterado)</span>
                                </label>
                                {/* 🚫 BLOQUEADO: Paciente não pode ser alterado em agendamento existente */}
                                <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 flex items-center gap-3">
                                    <i className="fas fa-user-lock text-gray-500"></i>
                                    <span className="font-medium">
                                        {patients.find(p => p._id === editedAppointment.patientId)?.fullName || 
                                         event?.patient?.fullName || 
                                         'Paciente não encontrado'}
                                    </span>
                                </div>
                                <p className="text-xs text-amber-600 mt-1">
                                    <i className="fas fa-exclamation-triangle mr-1"></i>
                                    Para trocar de paciente, cancele este agendamento e crie um novo.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-green-600" />
                                    Profissional *
                                </label>
                                <Select
                                    value={editedAppointment.doctorId || ''}
                                    onChange={(e) => handleFieldChange('doctorId', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                    disabled={loadingDoctors}
                                >
                                    <option value="">
                                        {loadingDoctors
                                            ? 'Carregando profissionais...'
                                            : 'Selecione um profissional'}
                                    </option>
                                    {compatibleDoctors?.map(doctor => (
                                        <option key={doctor._id?.toString?.() || doctor._id} value={doctor._id?.toString?.() || doctor._id}>
                                            {doctor.fullName} {doctor.specialty ? `(${doctor.specialty})` : ''}
                                        </option>
                                    ))}
                                </Select>
                                {loadingDoctors ? (
                                    <p className="text-xs text-blue-500 mt-1">
                                        ⏳ Carregando lista de profissionais...
                                    </p>
                                ) : editedAppointment.doctorId && !compatibleDoctors.find(d => d._id === editedAppointment.doctorId) ? (
                                    <p className="text-xs text-red-500 mt-1 font-semibold">
                                        ⚠️ Profissional incompatível com a especialidade selecionada
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-green-600" />
                                    Data *
                                </label>
                                <DatePicker
                                    selected={editedAppointment.date ? new Date(editedAppointment.date + 'T00:00:00') : null}
                                    onChange={(date) => {
                                        if (!date) return;
                                        handleFieldChange('date', date.toLocaleDateString('sv-SE'));
                                    }}
                                    customInput={
                                        <ReactInputMask
                                            mask="99/99/9999"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                        />
                                    }
                                    placeholderText='dd/MM/yyyy'
                                    locale={ptBR}
                                    dateFormat="dd/MM/yyyy"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-green-600" />
                                    Hora *
                                </label>
                                <DatePicker
                                    selected={editedAppointment.time ? new Date(`1970-01-01T${editedAppointment.time}`) : null}
                                    onChange={(date) =>
                                        handleFieldChange('time', date?.toTimeString().slice(0, 5) ?? '')
                                    }
                                    showTimeSelect
                                    showTimeSelectOnly
                                    timeIntervals={15}
                                    timeFormat="HH:mm"
                                    dateFormat="HH:mm"
                                    placeholderText='HH:MM'
                                    customInput={
                                        <ReactInputMask
                                            mask="99:99"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                        />
                                    }
                                />
                            </div>
                        </div>

                        {/* 🆕 NOVO: Tipo de Serviço e Especialidade */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Tipo de Serviço
                                </label>
                                <Select
                                    value={serviceType}
                                    onChange={(e) => setServiceType(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                >
                                    <option value="alignment">Alinhamento</option>
                                    <option value="consultation">Consulta</option>
                                    <option value="evaluation">Avaliação</option>
                                    <option value="neuropsych_evaluation">Avaliação Neuropsicológica</option>
                                    <option value="return">Retorno</option>
                                    <option value="meet">Reunião</option>
                                    <option value="individual_session">Sessão Avulsa</option>
                                    <option value="package_session">Sessão de Pacote</option>
                                    <option value="tongue_tie_test">Teste da Linguinha</option>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Especialidade
                                </label>
                                <Select
                                    value={editedAppointment.sessionType}
                                    onChange={(e) => handleFieldChange('sessionType', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                >
                                    <option value="fonoaudiologia">Fonoaudiologia</option>
                                    <option value="psicologia">Psicologia</option>
                                    <option value="terapia_ocupacional">Terapia Ocupacional</option>
                                    <option value="fisioterapia">Fisioterapia</option>
                                    <option value="pediatria">Pediatria</option>
                                    <option value="neuroped">Neuropediatria</option>
                                    <option value="psicomotricidade">Psicomotricidade</option>
                                    <option value="musicoterapia">Musicoterapia</option>
                                    <option value="psicopedagogia">Psicopedagogia</option>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                <ClipboardCheck className="w-4 h-4 text-green-600" />
                                Motivo da Consulta
                            </label>
                            <textarea
                                value={editedAppointment.reason}
                                onChange={(e) => handleFieldChange('reason', e.target.value)}
                                rows={3}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                placeholder="Descreva o motivo da consulta..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Status Operacional
                                </label>
                                <select
                                    value={editedAppointment.operationalStatus}
                                    onChange={(e) => handleFieldChange('operationalStatus', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                >
                                    {Object.entries(STATUS_VISUAL_CONFIG.operational).map(([key, config]) => (
                                        <option key={key} value={key}>
                                            {config.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Status Clínico
                                </label>
                                <select
                                    value={editedAppointment.clinicalStatus}
                                    onChange={(e) => handleFieldChange('clinicalStatus', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                >
                                    {Object.entries(STATUS_VISUAL_CONFIG.clinical).map(([key, config]) => (
                                        <option key={key} value={key}>
                                            {config.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {permissions.canSeeFinancial && (
                            <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-4 space-y-3">
                                {/* Header */}
                                <div className="flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cobrança</span>
                                </div>

                                {/* Toggle segmentado */}
                                <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1">
                                    <button type="button" onClick={() => setBillingType('particular')}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                            billingType === 'particular'
                                                ? 'bg-green-600 text-white shadow-sm'
                                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                        }`}>
                                        Particular
                                    </button>
                                    <button type="button" onClick={() => setBillingType('convenio')}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                            billingType === 'convenio'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                        }`}>
                                        Convênio
                                    </button>
                                </div>

                                {billingType === 'particular' ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-500">Valor (R$)</label>
                                            <InputCurrency value={paymentAmount} onChange={setPaymentAmount}
                                                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 bg-white" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-500">Método</label>
                                            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                                                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 bg-white">
                                                <option value="">Selecione</option>
                                                <option value="pix">Pix</option>
                                                <option value="dinheiro">Dinheiro</option>
                                                <option value="cartao_credito">Cartão de Crédito</option>
                                                <option value="cartao_debito">Cartão de Débito</option>
                                                <option value="transferencia_bancaria">Transferência</option>
                                                <option value="outro">Outro</option>
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500">Convênio</label>
                                                <input type="text" value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)}
                                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 bg-white"
                                                    placeholder="Nome do plano" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500">Valor (R$)</label>
                                                <InputCurrency name="insuranceValue" value={insuranceValue} onChange={(e) => setInsuranceValue(Number(e.target.value))}
                                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                );

            default:
                return null;
        }
    };

    const renderActionButton = () => {
        switch (activeTab) {
            case 'confirm':
                // 🔔 Se for pré-agendamento, mostra botão de converter (se tiver permission)
                if (event?.__isPreAgendamento) {
                    if (!permissions.canConvertPreAgendamento) {
                        return null;
                    }
                    return (
                        <button
                            onClick={handleConvert}
                            disabled={isConverting}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl"
                        >
                            {isConverting ? (
                                <>
                                    <LoadingSpinner size="small" color="border-white" fullPage={false} />
                                    <span>Convertendo...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} />
                                    <span>Converter em Agendamento</span>
                                </>
                            )}
                        </button>
                    );
                }
                // 🎯 FLUXO DE STATUS: a aba 'confirm' adapta a ação ao estado operacional
                // (ver doc completa no topo do arquivo — todo status novo precisa entrar
                // em um dos 3 grupos abaixo, senão o botão some sem aviso nenhum).
                // 'pending' é o status inicial usado pelo fluxo HYBRID (particular avulsa / pacote pago —
                // ver AppointmentHybridService) e é tratado como equivalente a 'scheduled' em todo o
                // backend (guards de convênio/pacote, completeSessionService); o botão precisa acompanhar.
                // 'pre_agendado' também recebe o botão de confirmar — ao confirmar vira agendamento real.
                const opStatus = event?.operationalStatus;

                // 🏥 CONVÊNIO: confirmar presença e realizar atendimento são a mesma ação financeira
                // (o plano paga posteriormente via faturamento). Por isso, para convênio o botão
                // sempre executa o fluxo de complete (o backend resolve o roteamento financeiro internamente), evitando
                // sessões presas em 'confirmed'.
                const isConvenioFlow = event?.billingType === 'convenio' || event?.paymentMethod === 'convenio' || !!event?.insuranceProvider || !!event?.insuranceGuide;
                const canCompleteConvenio = isConvenioFlow && !['completed', 'canceled'].includes(opStatus || '');

                if (canCompleteConvenio) {
                    return (
                        <button
                            onClick={handleComplete}
                            disabled={isCompleting || isAddingDebit}
                            className={`px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl ${
                                addToBalance
                                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white'
                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                            }`}
                        >
                            {isCompleting || isAddingDebit ? (
                                <>
                                    <LoadingSpinner size="small" color="border-white" fullPage={false} />
                                    <span>
                                        {isAddingDebit ? 'Registrando débito...' : 'Registrando...'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} />
                                    <span>
                                        {addToBalance
                                            ? `Concluir e Adicionar R$ ${debitAmount % 1 === 0 ? debitAmount.toFixed(0) : debitAmount.toFixed(2).replace('.', ',')} ao Saldo`
                                            : 'Realizar Atendimento'
                                        }
                                    </span>
                                </>
                            )}
                        </button>
                    );
                }

                if (opStatus === 'scheduled' || opStatus === 'pending' || opStatus === 'pre_agendado') {
                    // 💰 Quando "Adicionar ao Saldo Devedor" está marcado, confirmar presença
                    // deve COMPLETAR o atendimento e adicionar o débito — não apenas confirmar.
                    if (addToBalance) {
                        return (
                            <button
                                onClick={handleComplete}
                                disabled={isCompleting || isAddingDebit}
                                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl"
                            >
                                {isCompleting || isAddingDebit ? (
                                    <>
                                        <LoadingSpinner size="small" color="border-white" fullPage={false} />
                                        <span>Registrando débito...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} />
                                        <span>
                                            {`Concluir e Adicionar R$ ${debitAmount % 1 === 0 ? debitAmount.toFixed(0) : debitAmount.toFixed(2).replace('.', ',')} ao Saldo`}
                                        </span>
                                    </>
                                )}
                            </button>
                        );
                    }

                    return (
                        <button
                            onClick={handleConfirm}
                            disabled={isConfirming}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl"
                        >
                            {isConfirming ? (
                                <>
                                    <LoadingSpinner size="small" color="border-white" fullPage={false} />
                                    <span>Confirmando...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} />
                                    <span>Confirmar Presença</span>
                                </>
                            )}
                        </button>
                    );
                }

                // 'missed' tratado igual 'confirmed': permite corrigir uma falta marcada
                // errada (paciente foi atendido de verdade) sem precisar reabrir/reagendar.
                if (opStatus === 'confirmed' || opStatus === 'missed') {
                    return (
                        <button
                            onClick={handleComplete}
                            disabled={isCompleting || isAddingDebit}
                            className={`px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl ${
                                addToBalance 
                                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white' 
                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                            }`}
                        >
                            {isCompleting || isAddingDebit ? (
                                <>
                                    <LoadingSpinner size="small" color="border-white" fullPage={false} />
                                    <span>
                                        {isAddingDebit ? 'Registrando débito...' : 'Registrando...'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} />
                                    <span>
                                        {addToBalance
                                            ? `Concluir e Adicionar R$ ${debitAmount % 1 === 0 ? debitAmount.toFixed(0) : debitAmount.toFixed(2).replace('.', ',')} ao Saldo`
                                            : 'Realizar Atendimento'
                                        }
                                    </span>
                                </>
                            )}
                        </button>
                    );
                }

                // Status finalizado/cancelado: sem ação na aba confirm
                return null;

            case 'cancel':
                return (
                    <button
                        onClick={handleCancel}
                        disabled={isCancelling || !cancelReason.trim()}
                        className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-200 flex items-center gap-2 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl"
                    >
                        {isCancelling ? (
                            <>
                                <LoadingSpinner size="small" color="border-white" fullPage={false} />
                                <span>Cancelando...</span>
                            </>
                        ) : (
                            <>
                                <XCircle size={18} />
                                <span>Confirmar Cancelamento</span>
                            </>
                        )}
                    </button>
                );

            case 'edit':
                return (
                    <button
                        onClick={handleEdit}
                        disabled={isEditing}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-200 flex items-center gap-2 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl"
                    >
                        {isEditing ? (
                            <>
                                <LoadingSpinner size="small" color="border-white" fullPage={false} />
                                <span>Salvando...</span>
                            </>
                        ) : (
                            <>
                                <PencilIcon size={18} />
                                <span>Salvar Alterações</span>
                            </>
                        )}
                    </button>
                );

            default:
                return null;
        }
    };

    const getTabConfig = (tab: string) => {
        const config = {
            details: { icon: ClipboardCheck, color: 'green', title: 'Detalhes do Agendamento', description: 'Informações completas da consulta' },
            confirm: { icon: CheckCircle, color: 'green', title: 'Confirmar Agendamento', description: 'Confirme os detalhes do agendamento' },
            edit: { icon: PencilIcon, color: 'amber', title: 'Editar Agendamento', description: 'Edite os detalhes do agendamento' },
            cancel: { icon: XCircle, color: 'red', title: 'Cancelar Agendamento', description: 'Preencha os dados para cancelamento' }
        };
        return config[tab as keyof typeof config] || config.details;
    };

    const tabConfig = getTabConfig(activeTab);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col md:flex-row md:min-h-[600px] max-h-[90vh] overflow-hidden border-2 border-gray-200 relative">
                
                {/* 🔄 OVERLAY DE PROCESSAMENTO */}
                {processingState?.isProcessing && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-3xl">
                        <div className="relative">
                            {/* Spinner animado */}
                            <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                            {/* Ícone no centro */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                        <h3 className="mt-6 text-xl font-bold text-gray-800">
                            {processingState.message}
                        </h3>
                        <p className="mt-2 text-gray-500 text-center max-w-xs">
                            Isso pode levar alguns segundos.
                            <br />
                            Por favor, não feche esta janela.
                        </p>
                        {/* Barra de progresso simulada */}
                        <div className="mt-6 w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 animate-pulse rounded-full" 
                                 style={{ width: '60%', animation: 'progress 2s ease-in-out infinite' }} />
                        </div>
                    </div>
                )}
                {/* Header Mobile */}
                <div className="md:hidden bg-gradient-to-r from-green-600 via-green-500 to-cyan-500 p-6 text-white rounded-t-3xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                <tabConfig.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{tabConfig.title}</h2>
                                <p className="text-green-100 text-sm">{tabConfig.description}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-xl p-2 transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Abas laterais - Desktop */}
                <div className="hidden md:flex w-1/4 bg-gradient-to-b from-green-50 via-emerald-50 to-cyan-50 rounded-l-3xl p-6 flex-col border-r-2 border-green-100">
                    <div className="space-y-3">
                        {availableTabs.map((tab) => {
                            const config = getTabConfig(tab);
                            const Icon = config.icon;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center gap-3 font-semibold ${activeTab === tab
                                            ? 'bg-gradient-to-r from-green-600 to-cyan-500 text-white shadow-lg scale-105'
                                            : 'hover:bg-white/70 text-gray-700 hover:text-gray-900 hover:scale-102'
                                        }`}
                                >
                                    <Icon size={20} />
                                    <span>{config.title.split(' ')[0]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Abas Mobile */}
                <div className="md:hidden bg-gradient-to-r from-gray-50 to-green-50 p-3 border-b-2 border-gray-200">
                    <div className="flex overflow-x-auto space-x-2">
                        {availableTabs.map((tab) => {
                            const config = getTabConfig(tab);
                            const Icon = config.icon;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 font-semibold ${activeTab === tab
                                            ? 'bg-gradient-to-r from-green-600 to-cyan-500 text-white shadow-lg'
                                            : 'text-gray-600 hover:bg-white border border-gray-200'
                                        }`}
                                >
                                    <Icon size={16} />
                                    <span className="text-sm">{config.title.split(' ')[0]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Conteúdo principal */}
                <div className="flex-1 p-4 md:p-8 flex flex-col overflow-hidden">
                    {/* Header Desktop */}
                    <div className="hidden md:flex items-center gap-4 mb-6 pb-6 border-b-2 border-gray-200">
                        <div className="p-3 bg-gradient-to-br from-green-100 to-cyan-100 rounded-2xl shadow-lg">
                            <tabConfig.icon className="w-7 h-7 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{tabConfig.title}</h2>
                            <p className="text-gray-600">{tabConfig.description}</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        {renderTabContent()}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-6 border-t-2 border-gray-200">
                        {renderActionButton()}
                        <button
                            onClick={onClose}
                            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-bold"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
            
            {/* 💰 MODAL DE CONTA CORRENTE */}
            <PatientBalanceModal
                isOpen={isBalanceModalOpen}
                onClose={() => setIsBalanceModalOpen(false)}
                patientId={event?.patient?.id || ''}
                patientName={event?.patient?.fullName || 'Paciente'}
                onRefresh={onRefreshAppointments}
            />

            {/* ⚠️ CONFIRMAÇÃO DE DÍVIDA */}
            {showDebtConfirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
                        <div className="flex items-start gap-4 mb-5">
                            <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                <DollarSign className="h-5 w-5 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-bold text-gray-900">Saldo em aberto</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Este paciente possui{' '}
                                    <span className="font-semibold text-red-600">
                                        R$ {patientFinancial?.sessionDebt.toFixed(2).replace('.', ',')}
                                    </span>{' '}
                                    em aberto.
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Deseja finalizar a sessão mesmo assim?
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowDebtConfirm(false); debtConfirmResolve?.(null); }}
                                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => { setShowDebtConfirm(false); debtConfirmResolve?.(true); }}
                                className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-colors"
                            >
                                Completar e cobrar depois
                            </button>
                            <button
                                onClick={() => { setShowDebtConfirm(false); debtConfirmResolve?.(false); }}
                                className="w-full px-4 py-2.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-semibold text-sm transition-colors"
                            >
                                Quitar dívida primeiro
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

};

export default AppointmentDetailModal;