// types.ts
export type TherapyType = 'fonoaudiologia' | 'terapia_ocupacional' | 'psicologia' | 'fisioterapia';
export type PaymentType = 'full' | 'per-session' | 'partial';
export type PackageStatus = 'ativo' | 'finalizado';

export const THERAPY_TYPES = [
    { value: 'fonoaudiologia', label: 'Fonoaudiologia' },
    { value: 'terapia_ocupacional', label: 'Terapia Ocupacional' },
    { value: 'psicologia', label: 'Psicologia' },
    { value: 'fisioterapia', label: 'Fisioterapia' },
    { value: 'pediatria', label: 'Pediatria' },
    { value: 'neuropediatria', label: 'Neuropediatria' }
];

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
    date: string;
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
    specialty: '',
    active: '',
    _id: '',
    email: '',
    phoneNumber: '',
    licenseNumber: '',
    password: '',
    createdAt: string;
    updatedAt: string;
}

export interface IDoctor {
    _id: string;
    fullName: string;
    specialty: string;
    email: string;
    phoneNumber: string;
    licenseNumber: string;
    password: string;
    active: boolean;
    weeklyAvailability: any[]
}

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
    packageId?: string;
    doctorId: string;
    date: string;
    time: string;
    sessionType: 'fonoaudiologia' | 'terapia_ocupacional' | 'psicologia' | 'fisioterapia';
    specialty: 'fonoaudiologia' | 'terapia_ocupacional' | 'psicologia' | 'fisioterapia';
    notes?: string;
    serviceType: 'evaluation' | 'session' | 'package_session' | 'individual_session';
    paymentAmount?: number;
    paymentMethod?: 'dinheiro' | 'pix' | 'cartão';
    status: 'agendado' | 'concluído' | 'cancelado';
    packages?: string[];
    reason?: string;
    clinicalStatus?: 'pendente' | 'em_andamento' | 'concluído' | 'faltou';
    operationalStatus?: 'agendado' | 'confirmado' | 'cancelado' | 'pago' | 'faltou';
    duration?: number;
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
    date: string; // ISO string (ex: "2025-07-02T11:40:00.000Z")
    startTime: string; // ex: "08:40"
    status: 'agendado' | 'concluído' | 'cancelado' | string;
    formattedDate: string; // ex: "02/07/2025, 08:40"
    backgroundColor: string;
    borderColor: string;
    start: string; // mesmo valor que formattedDate
}

export interface IPatient {
    _id?: string;
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
        date: string;
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
];

export interface IAppointment {
    _id: string;
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    reason: string;
    clinicalStatus?: 'pendente' | 'em_andamento' | 'concluído' | 'faltou';
    operationalStatus?: 'agendado' | 'confirmado' | 'cancelado' | 'pago' | 'faltou';
    duration: number;
    sessionType: TherapyType;
    paymentMethod?: string;
    paymentAmount: number;
    notes?: string;
    serviceType: string;
    createdAt: Date;
    updatedAt: Date;
    canceledAt?: Date;
    canceledReason?: string;
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
        date: string;
        slots: string[]
    }[]
}

export type AppointmentStatus =
    | 'agendado' | 'confirmado' | 'cancelado' | 'pago'
    | 'pendente' | 'em_andamento' | 'concluído' | 'faltou';

