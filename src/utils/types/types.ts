export type TherapyType =
    | 'fonoaudiologia'
    | 'terapia_ocupacional'
    | 'psicologia'
    | 'fisioterapia'
    | 'pediatria'
    | 'neuropediatria'
    | 'psicomotricidade'
    | 'musicoterapia'
    | 'psicopedagogia';

export type PaymentType = 'full' | 'per-session' | 'partial';
export type PackageStatus = 'ativo' | 'finalizado';

export const THERAPY_TYPES = [
    { value: 'fonoaudiologia', label: 'Fonoaudiologia' },
    { value: 'terapia_ocupacional', label: 'Terapia Ocupacional' },
    { value: 'psicologia', label: 'Psicologia' },
    { value: 'fisioterapia', label: 'Fisioterapia' },
    { value: 'pediatria', label: 'Pediatria' },
    { value: 'neuropediatria', label: 'Neuropediatria' },
    { value: 'musicoterapia', label: 'Musicoterapia' },
    { value: 'psicomotricidade', label: 'Psicomotricidade' },
    { value: 'psicopedagogia', label: 'Psicopedagogia' },
];

export interface AdminInfo {
    _id?: string;
    fullName: string;
    email: string;
}

export const PAYMENT_TYPES = [
    { value: 'full', label: 'Pagamento total antecipado' },
    { value: 'per-session', label: 'Pagamento por sessão' },
    { value: 'partial', label: 'Pagamento parcial' },
];

export const statusConfig = {
    active: {
        color: 'bg-green-100 text-green-800',
        text: 'Ativo',
        tagColor: 'green',
    },
    pending: {
        color: 'bg-yellow-100 text-yellow-800',
        text: 'Pendente',
        tagColor: 'gold',
    },
    completed: {
        color: 'bg-blue-100 text-blue-800',
        text: 'Completo',
        tagColor: 'blue',
    },
    default: {
        color: 'bg-gray-100 text-gray-800',
        text: 'Indefinido',
        tagColor: 'gray',
    },
};

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
}

export interface IPayment {
    _id: string;
    amount: number;
    paymentMethod: 'dinheiro' | 'pix' | 'cartão';
    date?: string; // Adicionar se existir nos dados reais
    notes?: string;
}

export interface ISession {
    _id?: string;
    date: string | Date; // 🆕 Pode ser string ou Date
    time: string;
    doctorId: string;
    sessionId?: string;
    patientId: string;
    package: string;
    sessionType: 'fonoaudiologia' | 'terapia_ocupacional' | 'psicologia' | 'fisioterapia';
    status: 'pending' | 'completed' | 'canceled';
    paymentAmount?: number;
    paymentMethod?: 'dinheiro' | 'pix' | 'cartão';
    notes?: string;
    isPaid?: boolean;
    confirmedAbsence?: boolean | null;
}

export const DURATION_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
export const FREQUENCY_OPTIONS = Array.from({ length: 5 }, (_, i) => i + 1);

export interface ITherapyPackage {
    _id: string;
    patient: string;
    professional: string;
    sessionType: 'fonoaudiologia' | 'terapia_ocupacional' | 'psicologia' | 'fisioterapia';
    totalSessions: number;
    sessions: ISession[];
    sessionsDone: number;
    sessionValue: number;
    payments: IPayment[];
    status: 'active' | 'completed' | 'pending';
    totalPaid: number;
    balance: number;
    remaining: number;
    totalValue: number;
    credit: number;
    __v?: number;
    createdAt?: string;
    updatedAt?: string;

    // 🏥 Campos de convênio
    type?: 'therapy' | 'convenio' | 'liminar';
    insuranceGuide?: string;
    insuranceProvider?: string;
    insuranceGrossAmount?: number;
    insuranceBillingStatus?: 'pending_batch' | 'in_batch' | 'billed' | 'received' | null;
    
    // ⚖️ Campos de liminar
    liminarProcessNumber?: string;
    liminarCourt?: string;
    liminarExpirationDate?: string;
    liminarMode?: 'deferred' | 'immediate' | 'hybrid';
    liminarAuthorized?: boolean;
    liminarCreditBalance?: number;
    liminarTotalCredit?: number;
    recognizedRevenue?: number;
}

// export Interface da resposta paginada
export interface IPaginatedPackageResponse {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    data: ITherapyPackage[];
}

export const defaultAppointmentData = {
    patientId: '',
    doctorId: '',
    date: '',
    time: '',
    type: 'fonoaudiologia',
    reason: '',
    status: 'agendado'
};

export interface IDoctors {
    fullName: '',
    active: '',
    _id: '',
    email: '',
    phoneNumber: '',
    licenseNumber: '',
    password: '',
    createdAt: string;
    updatedAt: string;
    specialty: '',
    specialties?: string[];
}

export interface IDoctor {
    _id: string;
    fullName: string;
    specialty: string;
    specialties?: string[];
    email: string;
    phoneNumber: string;
    licenseNumber: string;
    password: string;
    active: boolean;
    weeklyAvailability: any[]
}

export const EXTRA_SPECIALTIES = [
    { value: "psicopedagogia", label: "Psicopedagogia" },
    { value: "neuropsicologia", label: "Neuropsicologia" },
    { value: "psicologia_libras", label: "Psicologia em Libras" },
    // adicione outras que fizerem sentido
];

export const TAB_TITLES: Record<string, string> = {
    Dashboard: 'Dashboard',
    Profile: 'Meu Perfil',
    'Add Profissional': 'Profissionais',
    Calendário: 'Calendário',
    Financeiro: 'Financeiro',
    Leads: 'Leads / Follow-ups',
    Mensagens: 'Mensagens',
    'Add Admin': 'Adicionar Administrador',
};

export const PatientInitialValues = {
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
    imageAuthorization: false
}

export interface ScheduleAppointment {
    patientId: string;
    doctorId: string;
    date: string | Date; // 'YYYY-MM-DD' ou Date
    time: string; // 'HH:mm'

    // Terapia
    sessionType: TherapyType;
    specialty?: TherapyType;

    // Tipo de agendamento (todos que o select usa)
    serviceType:
    | 'evaluation'
    | 'session'
    | 'package_session'
    | 'individual_session'
    | 'alignment'
    | 'alignment '
    | 'return '
    | 'neuropsych_evaluation'
    | 'meet'
    | 'tongue_tie_test';

    status?: 'agendado' | 'confirmado' | 'concluído' | 'cancelado' | 'faltou';

    // Pacote
    packageId?: string;
    packages?: string[];

    // Financeiro
    paymentAmount?: number;
    paymentMethod?:
    | 'dinheiro'
    | 'pix'
    | 'cartão'
    | 'transferência'
    | 'plano-unimed';

    // Metadados
    notes?: string;
    reason?: string;

    clinicalStatus?: 'pendente' | 'em_andamento' | 'concluído' | 'faltou';
    operationalStatus?: 'agendado' | 'confirmado' | 'cancelado' | 'pago' | 'faltou';

    duration?: number;

    // 🏥 Convênio
    billingType?: 'particular' | 'convenio';
    insuranceProvider?: string;
    insuranceValue?: number;
    authorizationCode?: string;
    insurance?: {
        provider: string;
        grossAmount: number;
        authorizationCode?: string;
        status?: 'pending_billing' | 'billed' | 'received' | 'partial' | 'glosa';
    };

    // usado só pra sincronizar slots localmente
    _syncKey?: number;
}


export const STATUS_OPTIONS = [
    { label: 'Agendado', value: 'agendado' },
    { label: 'Concluído', value: 'concluído' },
    { label: 'Cancelado', value: 'cancelado' },
] as const;


export const ServiceTypes = [
    { value: 'evaluation', label: '01 - Avaliação Inicial' },
    { value: 'session', label: '02 - Sessão do Pacote' },
    { value: 'package', label: '03 - Pacote' },
    { value: 'individual_session', label: '04 -Sessão Individual' },
];

export const PaymentMethods = [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'pix', label: 'PIX' },
    { value: 'cartão', label: 'Cartão' }
];

export interface SelectedEvent {
    id: string;
    patient: {
        id: string;
        fullName: string;
    };
    doctor: {
        id: string;
        fullName: string;
    };
    date: Date | null;
    startTime: string;

    status?: 'agendado' | 'concluído' | 'cancelado' | string;
    operationalStatus?: string;
    clinicalStatus?: string;
    reason?: string;

    formattedDate: string;
    backgroundColor: string;
    borderColor: string;
    start: string;
    
    // 🆕 DADOS DE CONVÊNIO/PLANO
    billingType?: 'particular' | 'convenio';
    insuranceProvider?: string;
    insuranceValue?: number;
    authorizationCode?: string;
    
    // 🆕 DADOS DE SERVIÇO E PAGAMENTO
    serviceType?: string;
    paymentAmount?: number;
    sessionValue?: number;
    paymentMethod?: string;
    specialty?: string;
    
    // 🆕 INDICADOR DE PRÉ-AGENDAMENTO
    __isPreAgendamento?: boolean;
}

export interface SlotBookingPayload {
    time: string;
    date: string | Date;
    doctorId: string;
    specialty: string;
    isBookingModalOpen: boolean;
}


export interface IPatient {
    _id?: string;
    patientId?: string; // real Patient._id when returned from patients_view
    fullName: string;
    dateOfBirth: string;
    birthCertificate: string;
    gender: string;
    maritalStatus: string;
    profession: string;
    placeOfBirth: string;
    address: {
        street: string;
        number: string;
        district: string;
        city: string;
        state: string;
        zipCode: string;
    };
    phone: string;
    email: string;
    cpf: string;
    rg: string;
    packages: string[];
    specialties: string[];
    mainComplaint: string;
    clinicalHistory: string;
    medications: string;
    allergies: string;
    familyHistory: string;
    nextAppointment: string;
    lastAppointment: string;
    healthPlan: {
        name: string;
        policyNumber: string;
    };
    legalGuardian: string;
    emergencyContact: {
        name: string;
        phone: string;
        relationship: string;
    };
    appointments: {
        professional: string;
        date: string | Date;
        time: string;
        sessionType: string;
        status: string;
        reason: string;
    }[];
    imageAuthorization: boolean;
}


export const EspecialidadesDisponiveis = [
    { value: 'fonoaudiologia', label: 'Fonoaudiologia' },
    { value: 'psicologia', label: 'Psicologia' },
    { value: 'terapia_ocupacional', label: 'Terapia Ocupacional' },
    { value: 'fisioterapia', label: 'Fisioterapia' },
    { value: 'musicoterapia', label: 'Musicoterapia' },
    { value: 'psicomotricidade', label: 'Psicomotricidade' },
    { value: 'psicopedagogia', label: 'Psicopedagogia' },
];

export interface IAppointment {
    _id: string;
    patientId: string;
    doctorId: string;
    date: string | Date; // 🆕 Pode ser string (legado) ou Date (novo)
    time: string;
    reason: string;
    clinicalStatus?: 'pending' | 'in_progress' | 'completed' | 'missed';
    operationalStatus?: 'scheduled' | 'confirmed' | 'canceled' | 'paid' | 'missed';
    duration: number;
    sessionType: TherapyType;
    paymentMethod?: string;
    paymentAmount: number;
    notes?: string;
    serviceType: string;
    paymentStatus: string;
    createdAt: Date;
    updatedAt: Date;
    canceledAt?: Date;
    canceledReason?: string;

    // 🔹 adiciona esses dois como opcionais
    patient?: IPatient;
    doctor?: IDoctor;
    
    // 🆕 ARQUITETURA v4.0 - Campos financeiros
    patientBalance?: number;  // Saldo devedor do paciente (retornado no complete)
    paymentOrigin?: 'auto_per_session' | 'manual_balance' | 'package_prepaid' | 'convenio' | 'liminar';  // Origem do pagamento
    correlationId?: string;  // ID de correlação para rastreamento
    addedToBalance?: boolean;  // Se foi adicionado ao saldo devedor
    balanceAmount?: number;  // Valor adicionado ao saldo
    balanceDescription?: string;  // Descrição do saldo
}

export interface IAppointmentResponse extends Omit<IAppointment, 'patient' | 'doctor'> {
    patient: IPatient;
    doctor: IDoctor;
}

export interface IAppointmentResponse extends Omit<IAppointment, 'patient' | 'doctor'> {
    patient: IPatient;
    doctor: IDoctor;
}

export interface IPaginatedAppointmentResponse {
    data: IAppointmentResponse[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface IAvailableSlot {
    slots: {
        date: string | Date;
        slots: string[]
    }[]
}

export type AppointmentStatus =
    | 'agendado' | 'confirmado' | 'cancelado' | 'pago'
    | 'pendente' | 'em_andamento' | 'concluído' | 'faltou';

export interface SiteAnalyticsTableProps {
    data: {
        action: string;
        category?: string;
        label?: string;
        timestamp: string;
        value?: number;
    }[];
}

export const translateAction = (action: string) => {
    const map: Record<string, string> = {
        page_view: 'Visualizações de Página',
        scroll: 'Rolagem',
        user_engagement: 'Engajamento do Usuário',
        button_click: 'Clique em Botão',
        session_start: 'Início de Sessão',
        first_visit: 'Primeira Visita',
        popup_opened: 'Popup Aberto',
        popup_closed: 'Popup Fechado',
        whatsapp_click: 'Clique no WhatsApp',
        click: 'Clique Geral',
        article_clicked: 'Clique em Artigo',
        Clique_Agendamento: 'Clique em Agendamento',
        Clique_WhatsApp: 'Clique no WhatsApp',
        social_media_click: 'Clique em Rede Social'
    };
    return map[action] || action;
};

// ===========================================
// 🧱 Base Types
// ===========================================

export interface PaymentTotals {
    totalReceived: number;   // Soma de valores com status = "paid"
    totalPending: number;    // Soma de valores com status = "pending"
    totalPartial: number;    // Soma de valores com status = "partial"
    countReceived: number;   // Quantidade de pagamentos pagos
    countPending: number;    // Quantidade de pagamentos pendentes
    countPartial: number;    // Quantidade de pagamentos parciais

    // 💰 Particular (separado)
    particularReceived?: number;        // Valor particular recebido
    particularPending?: number;         // Valor particular pendente
    particularCountReceived?: number;   // Quantidade particular recebida
    particularCountPending?: number;    // Quantidade particular pendente

    // 🏥 Produção de Convênios
    totalInsuranceProduction?: number;  // Valor total de convênios realizados (independente de pagamento)
    totalInsuranceReceived?: number;    // Valor de convênios já recebidos
    totalInsurancePending?: number;     // Valor de convênios pendentes de recebimento
    countInsuranceTotal?: number;       // Quantidade total de atendimentos de convênio
    countInsuranceReceived?: number;    // Quantidade de convênios recebidos
    countInsurancePending?: number;     // Quantidade de convênios pendentes

    // 💰 Total combinado (caixa + convênios pendentes)
    totalCombined?: number;
}

export interface GroupedSummary {
    _id: string;             // Exemplo: "pix", "cartão", "package"
    total: number;           // Valor total neste grupo
    count: number;           // Quantidade de registros
}

export interface BreakdownEntry {
    _id: {
        year: number;
        month: number;
        day: number;
    };
    totalPaid: number;
    totalPending: number;
    totalPartial: number;
}

// ===========================================
// 🎛️ Filtros aplicados na query
// ===========================================
export interface PaymentTotalsFilters {
    period: "day" | "week" | "month" | "year" | "custom";
    doctorId?: string;
    paymentMethod?: string;
    serviceType?: string;
    status?: "paid" | "pending" | "partial";
    dateRange: {
        start: string; // ISO string
        end: string;   // ISO string
    };
}

// ===========================================
// 📦 Response principal
// ===========================================
export interface PaymentTotalsResponse {
    success: boolean;
    filters: PaymentTotalsFilters;
    data: {
        totals: PaymentTotals;
        byMethod: GroupedSummary[];
        byServiceType: GroupedSummary[];
        breakdown: BreakdownEntry[];
    };
}
