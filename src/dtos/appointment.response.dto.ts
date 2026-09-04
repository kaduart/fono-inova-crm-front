/**
 * RESPONSE DTOs de Appointment — Desacopla frontend do schema do backend
 *
 * Problemas que resolve:
 * 1. Backend retorna `patient` populado | `patientId` string | `patientInfo` → frontend usa `patient` (PatientDTO)
 * 2. Backend retorna `doctor` populado | `doctorId` string | `professionalName` → frontend usa `doctor` (DoctorDTO)
 * 3. Backend retorna `operationalStatus` | `status` | `state` → frontend usa `status`
 * 4. Backend retorna `payment` objeto | `paymentStatus` string → frontend usa `paymentStatus` (fonte: Payment)
 * 5. Backend retorna `sessionValue` | `paymentAmount` | `valor` → frontend usa `amount`
 */

import { PatientDTO, extractPatientId, extractPatientName } from './patient.response.dto';

export interface DoctorDTO {
    id: string;
    name: string;
    specialty?: string;
    email?: string;
    phone?: string;
}

export interface AppointmentDTO {
    id: string;
    date: string;           // ISO string
    time?: string;
    status: string;         // operationalStatus normalizado
    operationalStatus: string; // 🔄 alias legado para compatibilidade com componentes que ainda usam operationalStatus
    clinicalStatus?: string;
    patient: PatientDTO;
    doctor: DoctorDTO;
    amount?: number;        // sessionValue / paymentAmount normalizado
    sessionValue?: number;
    paymentAmount?: number;
    depositAmount?: number;
    remainingAmount?: number | null;
    specialty?: string;
    sessionType?: string;
    serviceType?: string;
    reason?: string;
    notes?: string;
    paymentStatus?: string; // fonte de verdade: Payment.status
    billingType?: string;
    paymentMethod?: string;
    insuranceProvider?: string;
    insuranceValue?: number;
    insuranceGuide?: string | null;
    insuranceGuideNumber?: string | null;
    insurancePlan?: string | null;
    authorizationCode?: string;
    isPackageSession?: boolean;
    package?: {
        _id?: string;
        sessionsRemaining?: number;
        totalSessions?: number;
        sessionsDone?: number;
        liminarCreditBalance?: number;
        liminarTotalCredit?: number;
    };
    liminarContract?: {
        _id?: string;
        processNumber?: string;
        court?: string;
        totalCredit?: number;
        creditBalance?: number;
        usedCredit?: number;
        status?: string;
        mode?: string;
    };
    isFirstVisit?: boolean;
    patientJourneyType?: 'new_patient' | 'new_specialty' | 'returning_patient';
    duration?: number;
    isReturningAfter45Days?: boolean;
    canceledReason?: string;
    canceledAt?: string;
    correlationId?: string;
    raw: any;
}

function extractDoctorDTO(raw: any): DoctorDTO {
    if (!raw) return { id: '', name: 'Desconhecido' };

    // Objeto populado
    if (typeof raw === 'object') {
        return {
            id: raw._id?.toString?.() || raw.id?.toString?.() || '',
            name: raw.fullName || raw.name || raw.nome || 'Desconhecido',
            specialty: raw.specialty || raw.specialties?.[0] || undefined,
            email: raw.email || undefined,
            phone: raw.phoneNumber || raw.phone || undefined,
        };
    }

    // String ID (doctorId)
    if (typeof raw === 'string') {
        return { id: raw, name: 'Desconhecido' };
    }

    return { id: '', name: 'Desconhecido' };
}

function extractAppointmentStatus(raw: any): string {
    return raw.operationalStatus || raw.status || raw.state || 'scheduled';
}

function extractAppointmentAmount(raw: any): number | undefined {
    const val = raw.sessionValue ?? raw.paymentAmount ?? raw.valor ?? raw.amount;
    return typeof val === 'number' && !isNaN(val) ? val : undefined;
}

function extractPaymentStatus(raw: any): string | undefined {
    // Fonte de verdade: Payment.status (se payment populado)
    if (raw.payment?.status) {
        return raw.payment.status;
    }
    // Fallback para paymentStatus direto (menos confiável)
    if (raw.paymentStatus) {
        return raw.paymentStatus;
    }
    return undefined;
}

/**
 * Mapeia response bruta de agendamento para AppointmentDTO estável.
 */
export function mapAppointmentResponseDTO(raw: any): AppointmentDTO {
    if (!raw) {
        return {
            id: '',
            date: '',
            status: 'scheduled',
            operationalStatus: 'scheduled',
            patient: { id: '', name: 'Desconhecido', debt: 0, totalPending: 0, particularPending: 0, convenioPending: 0, totalAppointments: 0, totalCompleted: 0, totalCanceled: 0, totalNoShow: 0, totalPackages: 0, raw: null },
            doctor: { id: '', name: 'Desconhecido' },
            raw: null,
        };
    }

    // Paciente: pode ser objeto populado, string, ou vir em patientInfo
    const patientRaw = raw.patient || raw.patientInfo || { _id: raw.patientId, fullName: raw.patientName };
    const doctorRaw = raw.doctor || raw.professional || { _id: raw.doctorId, fullName: raw.professionalName };

    return {
        id: raw._id?.toString?.() || raw.id?.toString?.() || '',
        date: raw.date || raw.start || '',
        time: raw.time || raw.startTime || undefined,
        status: extractAppointmentStatus(raw),
        operationalStatus: extractAppointmentStatus(raw),
        clinicalStatus: raw.clinicalStatus || undefined,
        patient: {
            id: extractPatientId(patientRaw),
            name: extractPatientName(patientRaw),
            debt: 0,
            totalPending: 0,
            particularPending: 0,
            convenioPending: 0,
            totalAppointments: 0,
            totalCompleted: 0,
            totalCanceled: 0,
            totalNoShow: 0,
            totalPackages: 0,
            raw: patientRaw,
        },
        doctor: extractDoctorDTO(doctorRaw),
        amount: extractAppointmentAmount(raw),
        sessionValue: typeof raw.sessionValue === 'number' ? raw.sessionValue : extractAppointmentAmount(raw),
        paymentAmount: typeof raw.paymentAmount === 'number' ? raw.paymentAmount : extractAppointmentAmount(raw),
        depositAmount: typeof raw.depositAmount === 'number' ? raw.depositAmount : 0,
        remainingAmount: typeof raw.remainingAmount === 'number' ? raw.remainingAmount : null,
        specialty: raw.specialty || raw.sessionType || undefined,
        sessionType: raw.sessionType || undefined,
        serviceType: raw.serviceType || undefined,
        reason: raw.reason || raw.notes || undefined,
        notes: raw.notes || undefined,
        paymentStatus: extractPaymentStatus(raw),
        billingType: raw.billingType || undefined,
        paymentMethod: raw.paymentMethod || undefined,
        insuranceProvider: raw.insuranceProvider || undefined,
        insuranceValue: typeof raw.insuranceValue === 'number' ? raw.insuranceValue : undefined,
        insuranceGuide: raw.insuranceGuide || null,
        insuranceGuideNumber: raw.insuranceGuideNumber || null,
        insurancePlan: raw.insurancePlan || null,
        authorizationCode: raw.authorizationCode || undefined,
        isPackageSession: raw.serviceType === 'package_session' || !!raw.package || !!raw.packageId,
        package: typeof raw.package === 'object' && raw.package !== null ? raw.package : undefined,
        liminarContract: typeof raw.liminarContract === 'object' && raw.liminarContract !== null ? raw.liminarContract : undefined,
        isFirstVisit: raw.isFirstVisit || false,
        patientJourneyType: raw.patientJourneyType || undefined,
        isReturningAfter45Days: raw.isReturningAfter45Days || false,
        duration: raw.duration || undefined,
        canceledReason: raw.canceledReason || undefined,
        canceledAt: raw.canceledAt || undefined,
        correlationId: raw.correlationId || undefined,
        raw,
    };
}

/**
 * Mapeia lista de agendamentos brutos.
 */
export function mapAppointmentListResponseDTO(rawList: any[]): AppointmentDTO[] {
    if (!Array.isArray(rawList)) return [];
    return rawList.map(mapAppointmentResponseDTO);
}
