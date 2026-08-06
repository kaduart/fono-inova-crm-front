/**
 * RESPONSE DTOs de Session — Desacopla frontend do schema do backend
 *
 * Problemas que resolve:
 * 1. Backend retorna `_id` | `sessionId` | `id` → frontend usa `id`
 * 2. Backend retorna `doctor` (populado/string) | `doctorId` | `professional` → frontend usa `doctorId`
 * 3. Backend retorna `patient` (populado/string) | `patientId` → frontend usa `patientId`
 * 4. Backend retorna `sessionValue` | `paymentAmount` | `value` → frontend usa `paymentAmount`
 * 5. Backend retorna `sessionType` com espaço | underscore → frontend usa underscore
 * 6. Backend retorna `date` como ISO | Date object → frontend usa YYYY-MM-DD
 */

export interface SessionDTO {
    id: string;
    date: string;           // YYYY-MM-DD
    time: string;
    doctorId: string;
    patientId: string;
    packageId: string;
    sessionType: string;    // normalizado com underscore
    status: string;
    paymentAmount: number;
    paymentMethod: string;
    notes: string;
    isPaid: boolean;
    confirmedAbsence: boolean | null;
    professionalPaymentStatus: 'payable' | 'non_payable';
    professionalPaymentOverride: {
        excluded: boolean;
        reason?: string;
        excludedAt?: string;
        excludedBy?: string;
    } | null;
    professionalPaymentOverrideHistory: Array<{
        status: 'payable' | 'non_payable';
        reason: string;
        changedAt: string;
        changedBy?: string;
    }>;
    raw: any;
}

// ============================================================
// Extratores individuais (reutilizáveis)
// ============================================================

export function extractSessionId(raw: any): string {
    if (!raw) return '';
    // 🔥 PRIORIDADE: sessionId (usado por PackagesView V2) > _id (subdocumento) > id
    return raw.sessionId?.toString?.() || raw._id?.toString?.() || raw.id?.toString?.() || '';
}

export function extractDoctorId(raw: any): string {
    if (!raw) return '';
    // Campo direto
    if (raw.doctorId) {
        return typeof raw.doctorId === 'string' ? raw.doctorId : raw.doctorId.toString?.() || '';
    }
    // Objeto populado
    if (raw.doctor) {
        if (typeof raw.doctor === 'string') return raw.doctor;
        if (raw.doctor._id) return raw.doctor._id.toString?.() || '';
        if (raw.doctor.toString) return raw.doctor.toString();
    }
    // Fallback
    if (raw.professional) {
        return typeof raw.professional === 'string' ? raw.professional : raw.professional.toString?.() || '';
    }
    return '';
}

export function extractPatientId(raw: any): string {
    if (!raw) return '';
    if (raw.patientId) {
        return typeof raw.patientId === 'string' ? raw.patientId : raw.patientId.toString?.() || '';
    }
    if (raw.patient) {
        if (typeof raw.patient === 'string') return raw.patient;
        if (raw.patient._id) return raw.patient._id.toString?.() || '';
        if (raw.patient.toString) return raw.patient.toString();
    }
    return '';
}

export function extractPackageId(raw: any): string {
    if (!raw) return '';
    if (raw.packageId) {
        return typeof raw.packageId === 'string' ? raw.packageId : raw.packageId.toString?.() || '';
    }
    if (raw.package) {
        if (typeof raw.package === 'string') return raw.package;
        if (raw.package._id) return raw.package._id.toString?.() || '';
        if (raw.package.toString) return raw.package.toString();
    }
    return '';
}

export function extractSessionDate(raw: any): string {
    const date = raw?.date;
    if (!date) return '';
    if (date instanceof Date) {
        return date.toISOString().split('T')[0];
    }
    if (typeof date === 'string') {
        // Formato ISO: 2026-04-03T00:00:00.000Z
        if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
            return date.substring(0, 10);
        }
        // Formato toString(): Fri Apr 03 2026 09:00:00 GMT-0300
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }
        return date;
    }
    return '';
}

export function extractSessionType(raw: any): string {
    const st = raw?.sessionType || 'fonoaudiologia';
    return st.toString().replace(/\s+/g, '_').toLowerCase();
}

export function extractSessionStatus(raw: any): string {
    return raw?.status || 'pending';
}

export function extractPaymentAmount(raw: any): number {
    const val = raw?.paymentAmount ?? raw?.sessionValue ?? raw?.value ?? 0;
    return typeof val === 'number' && !isNaN(val) ? val : 0;
}

export function extractPaymentMethod(raw: any): string {
    return raw?.paymentMethod || raw?.payment_method || '';
}

export function extractNotes(raw: any): string {
    return raw?.notes || '';
}

export function extractIsPaid(raw: any): boolean {
    return raw?.isPaid ?? raw?.is_paid ?? false;
}

export function extractConfirmedAbsence(raw: any): boolean | null {
    const val = raw?.confirmedAbsence;
    if (val === true) return true;
    if (val === false) return false;
    return null;
}

export function extractProfessionalPaymentStatus(raw: any): 'payable' | 'non_payable' {
    return raw?.professionalPaymentStatus === 'non_payable' ? 'non_payable' : 'payable';
}

export function extractProfessionalPaymentOverride(raw: any): SessionDTO['professionalPaymentOverride'] {
    const override = raw?.professionalPaymentOverride;
    if (!override) return null;
    return {
        excluded: !!override.excluded,
        reason: override.reason || undefined,
        excludedAt: override.excludedAt ? new Date(override.excludedAt).toISOString() : undefined,
        excludedBy: override.excludedBy?.toString?.() || undefined,
    };
}

export function extractProfessionalPaymentOverrideHistory(raw: any): SessionDTO['professionalPaymentOverrideHistory'] {
    const history = raw?.professionalPaymentOverrideHistory;
    if (!Array.isArray(history)) return [];
    return history.map((entry: any) => ({
        status: entry.status === 'non_payable' ? 'non_payable' : 'payable',
        reason: entry.reason || '',
        changedAt: entry.changedAt ? new Date(entry.changedAt).toISOString() : new Date().toISOString(),
        changedBy: entry.changedBy?.toString?.() || undefined,
    }));
}

// ============================================================
// Mapeadores principais
// ============================================================

export interface SessionContext {
    doctorId?: string;
    patientId?: string;
    packageId?: string;
    sessionValue?: number;
    sessionType?: string;
}

export function mapSessionResponseDTO(raw: any, context?: SessionContext): SessionDTO {
    if (!raw) {
        return {
            id: '',
            date: '',
            time: '',
            doctorId: context?.doctorId || '',
            patientId: context?.patientId || '',
            packageId: context?.packageId || '',
            sessionType: context?.sessionType || 'fonoaudiologia',
            status: 'pending',
            paymentAmount: context?.sessionValue ?? 0,
            paymentMethod: '',
            notes: '',
            isPaid: false,
            confirmedAbsence: null,
            raw: null,
        };
    }

    return {
        id: extractSessionId(raw),
        date: extractSessionDate(raw),
        time: raw.time || '',
        doctorId: extractDoctorId(raw) || context?.doctorId || '',
        patientId: extractPatientId(raw) || context?.patientId || '',
        packageId: extractPackageId(raw) || context?.packageId || '',
        sessionType: extractSessionType(raw) || context?.sessionType || 'fonoaudiologia',
        status: extractSessionStatus(raw),
        paymentAmount: extractPaymentAmount(raw) || context?.sessionValue || 0,
        paymentMethod: extractPaymentMethod(raw),
        notes: extractNotes(raw),
        isPaid: extractIsPaid(raw),
        confirmedAbsence: extractConfirmedAbsence(raw),
        professionalPaymentStatus: extractProfessionalPaymentStatus(raw),
        professionalPaymentOverride: extractProfessionalPaymentOverride(raw),
        professionalPaymentOverrideHistory: extractProfessionalPaymentOverrideHistory(raw),
        raw,
    };
}

/**
 * Mapeia lista de sessões brutas.
 */
export function mapSessionListResponseDTO(rawList: any[]): SessionDTO[] {
    if (!Array.isArray(rawList)) return [];
    return rawList.map(mapSessionResponseDTO);
}

/**
 * Converte SessionDTO para ISession (formato usado pelos componentes legados)
 */
export function sessionDTOToISession(dto: SessionDTO): any {
    return {
        _id: dto.id,
        date: dto.date,
        time: dto.time,
        doctorId: dto.doctorId,
        patientId: dto.patientId,
        package: dto.packageId,
        sessionType: dto.sessionType,
        status: dto.status,
        paymentAmount: dto.paymentAmount,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        isPaid: dto.isPaid,
        confirmedAbsence: dto.confirmedAbsence,
        professionalPaymentStatus: dto.professionalPaymentStatus,
        professionalPaymentOverride: dto.professionalPaymentOverride,
        professionalPaymentOverrideHistory: dto.professionalPaymentOverrideHistory,
    };
}
