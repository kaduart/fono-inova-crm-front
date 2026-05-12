/**
 * RESPONSE DTOs de Payment — Desacopla frontend do schema do backend
 *
 * Problemas que resolve:
 * 1. Backend retorna `patient` populado | `patientId` string → frontend usa `patient` (PatientDTO)
 * 2. Backend retorna `appointment` populado | `appointmentId` string → frontend usa `appointment` (resumo)
 * 3. Backend retorna `amount` | `value` | `valor` → frontend usa `amount`
 * 4. Backend retorna `status` | `state` → frontend usa `status`
 * 5. Backend retorna `paymentMethod` | `method` | `formaPagamento` → frontend usa `method`
 */

import { PatientDTO, extractPatientId, extractPatientName } from './patient.response.dto';

export interface PaymentAppointmentDTO {
    id: string;
    date?: string;
    time?: string;
    status?: string;
}

export interface PaymentDoctorDTO {
    id: string;
    _id: string;       // alias de id — compatibilidade com FinancialRecord
    name: string;
    fullName?: string; // alias de name
    specialty?: string;
}

export interface PaymentDTO {
    id: string;
    _id: string;       // alias de id — compatibilidade com FinancialRecord
    amount: number;
    method: string;
    status: string;
    date: string;
    description?: string;
    notes?: string;
    patient: PatientDTO;
    doctor?: PaymentDoctorDTO;
    appointment?: PaymentAppointmentDTO;
    packageId?: string;
    sessionId?: string;
    billingType?: string;
    serviceType?: string;
    // Flags de appointment record (para ações no frontend)
    __isAppointmentRecord?: boolean;
    __hasPayment?: boolean;
    __realPaymentId?: string;
    __appointmentId?: string;
    // Convênio
    insuranceProvider?: string;
    insuranceStatus?: string;
    insuranceGrossAmount?: number;
    raw: any;
}

function extractPaymentStatus(raw: any): string {
    return raw.status || raw.state || 'pending';
}

function extractPaymentMethod(raw: any): string {
    return raw.paymentMethod || raw.method || raw.formaPagamento || 'pix';
}

function extractPaymentAmount(raw: any): number {
    const val = raw.amount ?? raw.value ?? raw.valor ?? 0;
    return typeof val === 'number' && !isNaN(val) ? val : 0;
}

function extractPaymentDate(raw: any): string {
    return raw.date || raw.createdAt || raw.paymentDate || new Date().toISOString();
}

function extractPaymentAppointment(raw: any): PaymentAppointmentDTO | undefined {
    const apt = raw.appointment;
    if (!apt) {
        const aptId = raw.appointmentId || raw.__appointmentId;
        if (aptId) {
            return { id: aptId.toString?.() || aptId };
        }
        return undefined;
    }

    return {
        id: apt._id?.toString?.() || apt.id?.toString?.() || '',
        date: apt.date || undefined,
        time: apt.time || undefined,
        status: apt.status || apt.operationalStatus || undefined,
    };
}

/**
 * Mapeia response bruta de pagamento para PaymentDTO estável.
 */
export function mapPaymentResponseDTO(raw: any): PaymentDTO {
    if (!raw) {
        return {
            id: '',
            amount: 0,
            method: 'pix',
            status: 'pending',
            date: new Date().toISOString(),
            patient: { id: '', name: 'Desconhecido', debt: 0, totalPending: 0, particularPending: 0, convenioPending: 0, totalAppointments: 0, totalCompleted: 0, totalCanceled: 0, totalNoShow: 0, totalPackages: 0, raw: null },
            raw: null,
        };
    }

    const patientRaw = raw.patient || { _id: raw.patientId, fullName: raw.patientName };

    const resolvedId = raw._id?.toString?.() || raw.id?.toString?.() || '';
    return {
        id: resolvedId,
        _id: resolvedId,
        amount: extractPaymentAmount(raw),
        method: extractPaymentMethod(raw),
        status: extractPaymentStatus(raw),
        date: extractPaymentDate(raw),
        description: raw.description || raw.notes || undefined,
        notes: raw.notes || undefined,
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
        appointment: extractPaymentAppointment(raw),
        packageId: raw.packageId?.toString?.() || raw.package?._id?.toString?.() || undefined,
        sessionId: raw.sessionId?.toString?.() || raw.session?._id?.toString?.() || undefined,
        billingType: raw.billingType || undefined,
        insuranceProvider: raw.insurance?.provider || raw.insuranceProvider || undefined,
        insuranceStatus: raw.insurance?.status || raw.insuranceBillingStatus || undefined,
        insuranceGrossAmount: raw.insurance?.grossAmount || raw.insuranceGrossAmount || undefined,
        raw,
    };
}

/**
 * Mapeia lista de pagamentos brutos.
 */
export function mapPaymentListResponseDTO(rawList: any[]): PaymentDTO[] {
    if (!Array.isArray(rawList)) return [];
    return rawList.map(mapPaymentResponseDTO);
}

// ============================================================
// Adapter: FinancialRecord (frontend) → PaymentDTO
// ============================================================

import { FinancialRecord } from '../services/paymentService';

/**
 * Converte FinancialRecord (estrutura interna do frontend) para PaymentDTO.
 * Use no PaymentPage e componentes que consomem o PaymentsContext.
 */
export function mapFinancialRecordToPaymentDTO(record: FinancialRecord): PaymentDTO {
    const patientRaw = record.patient || { _id: record.patientId };
    const doctorRaw = record.doctor || { _id: record.doctorId };
    const appointmentRaw = record.appointment || { _id: record.__appointmentId };

    const resolvedId = record._id || record.__realPaymentId || '';
    return {
        id: resolvedId,
        _id: resolvedId,
        amount: typeof record.amount === 'number' && !isNaN(record.amount) ? record.amount : 0,
        method: record.paymentMethod || 'pix',
        status: record.status || 'pending',
        date: record.date || record.createdAt || new Date().toISOString(),
        description: record.description || record.notes || undefined,
        notes: record.notes || undefined,
        patient: {
            id: extractPatientId(patientRaw) || record.patientId || '',
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
        doctor: doctorRaw._id || doctorRaw.id ? (() => {
            const dId = doctorRaw._id?.toString?.() || doctorRaw.id?.toString?.() || record.doctorId || '';
            const dName = doctorRaw.fullName || doctorRaw.name || doctorRaw.nome || 'Desconhecido';
            return { id: dId, _id: dId, name: dName, fullName: dName, specialty: doctorRaw.specialty || undefined };
        })() : undefined,
        appointment: (appointmentRaw._id || appointmentRaw.id || record.__appointmentId || appointmentRaw.date)
            ? {
                id: appointmentRaw._id?.toString?.() || appointmentRaw.id?.toString?.() || record.__appointmentId || '',
                date: appointmentRaw.date || undefined,
                time: appointmentRaw.time || undefined,
                status: appointmentRaw.status || undefined,
            }
            : undefined,
        packageId: record.packageId || record.package?._id || undefined,
        sessionId: record.sessionId || undefined,
        billingType: record.billingType || undefined,
        serviceType: record.serviceType || undefined,
        __isAppointmentRecord: record.__isAppointmentRecord,
        __hasPayment: record.__hasPayment,
        __realPaymentId: record.__realPaymentId,
        __appointmentId: record.__appointmentId,
        raw: record,
    };
}

export function mapFinancialRecordListToPaymentDTO(records: FinancialRecord[]): PaymentDTO[] {
    if (!Array.isArray(records)) return [];
    return records.map(mapFinancialRecordToPaymentDTO);
}

// ============================================================
// Adapter: AppointmentDTO → FinancialRecord (para PaymentsContext)
// ============================================================

import { AppointmentDTO } from './appointment.response.dto';

/**
 * Converte AppointmentDTO (dados normalizados da API) para FinancialRecord.
 * Use no PaymentsContext para eliminar adapters inline.
 */
export function mapAppointmentDTOToFinancialRecord(dto: AppointmentDTO): FinancialRecord {
    const isPackageAppointment = dto.isPackageSession || dto.serviceType === 'package_session';
    const hasPayment = !!dto.paymentStatus && dto.paymentStatus !== 'unknown';
    const realPaymentId = (dto.raw?.payment?._id?.toString?.() || dto.raw?.payment?.toString?.() || null);

    return {
        _id: realPaymentId || dto.id || '',
        date: dto.date ? new Date(dto.date).toISOString().split('T')[0] : '',
        description: dto.reason || dto.notes || '',
        amount: dto.amount || dto.raw?.sessionValue || dto.raw?.insuranceValue || 0,
        paid: dto.paymentStatus === 'paid' || dto.paymentStatus === 'package_paid',
        status: dto.paymentStatus || 'pending',
        specialty: dto.specialty || '',
        createdAt: dto.raw?.createdAt || '',
        patientId: dto.patient.id || '',
        doctorId: dto.doctor.id || '',
        serviceType: dto.serviceType || 'session',
        paymentMethod: dto.raw?.billingType === 'convenio' ? 'Convênio' : (dto.raw?.metadata?.paymentMethod || ''),
        notes: dto.notes || '',
        packageId: dto.raw?.package?._id?.toString?.() || dto.raw?.package || '',
        sessionId: dto.raw?.session?._id?.toString?.() || dto.raw?.session || '',
        advancedSessions: [],
        patient: dto.patient.raw || { _id: dto.patient.id, fullName: dto.patient.name },
        doctor: dto.doctor.raw || { _id: dto.doctor.id, fullName: dto.doctor.name },
        appointment: { date: dto.date || '', time: dto.time || '', status: dto.status || '' },
        advanceSessions: [],
        __isAppointmentRecord: true,
        __appointmentId: dto.id,
        __hasPayment: hasPayment,
        __realPaymentId: realPaymentId || undefined,
        __isPackageAppointment: isPackageAppointment,
    };
}

export function mapAppointmentDTOListToFinancialRecord(dtos: AppointmentDTO[]): FinancialRecord[] {
    if (!Array.isArray(dtos)) return [];
    return dtos.map(mapAppointmentDTOToFinancialRecord);
}
