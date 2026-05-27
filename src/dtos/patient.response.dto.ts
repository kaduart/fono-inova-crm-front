/**
 * RESPONSE DTOs de Patient — Desacopla frontend do schema do backend
 *
 * Problemas que resolve:
 * 1. Backend retorna `_id` | `patientId` | `id` → frontend usa `id`
 * 2. Backend retorna `fullName` | `name` | `nome` → frontend usa `name`
 * 3. Backend retorna `balance.current` | `balance` | `saldo` → frontend usa `debt`
 * 4. Backend retorna `stats.totalPending` / `stats.totalPendingParticular` → frontend usa `totalPending` / `particularPending` / `convenioPending`
 * 5. Backend retorna `phone` | `phoneNumber` | `telefone` | `mobile` → frontend usa `phone`
 */

export interface PatientPackageDTO {
    sessionType: string;
    totalSessions: number;
    sessionsDone: number;
    status?: 'active' | 'finished' | 'canceled';
}

export interface PatientNextAppointmentDTO {
    date?: string;
    doctor?: {
        name?: string;
        fullName?: string; // compatibilidade
        specialty?: string;
    };
}

export interface PatientHealthPlanDTO {
    name?: string;
}

export interface PatientDTO {
    id: string;
    name: string;
    fullName: string;                // alias de name (compatibilidade com componentes legados)
    patientId: string;               // alias de id (compatibilidade com componentes legados)
    email?: string;
    phone?: string;
    document?: string;
    dateOfBirth?: string;
    // Financeiro (normalizado)
    debt: number;                    // saldo devedor particular (fonte: balance.current ou stats)
    totalPending: number;            // total pendente geral (particular + convênio)
    totalPendingParticular: number;  // alias de particularPending (compatibilidade)
    particularPending: number;       // pendente particular
    convenioPending: number;         // pendente convênio
    // Stats
    totalAppointments: number;
    totalCompleted: number;
    totalCanceled: number;
    totalNoShow: number;
    totalPackages: number;
    firstAppointmentDate?: string;
    lastAppointmentDate?: string;
    nextAppointmentDate?: string;
    // Relacionamentos
    packages?: PatientPackageDTO[];
    nextAppointment?: PatientNextAppointmentDTO;
    lastAppointment?: { doctor?: { specialty?: string } };
    healthPlan?: PatientHealthPlanDTO;
    tags?: string[];
    // Metadados
    raw: any; // referência bruta para casos especiais
}

// ============================================================
// Extratores individuais (reutilizáveis)
// ============================================================

export function extractPatientId(raw: any): string {
    if (!raw) return '';
    return raw._id?.toString?.() || raw.patientId?.toString?.() || raw.id?.toString?.() || '';
}

export function extractPatientName(raw: any): string {
    if (!raw) return 'Desconhecido';
    const name = raw.fullName || raw.name || raw.nome || raw.patientName || raw.patientInfo?.fullName || raw.patientInfo?.nome || '';
    return name.trim() || 'Desconhecido';
}

export function extractPatientPhone(raw: any): string | undefined {
    if (!raw) return undefined;
    return raw.phone || raw.phoneNumber || raw.telefone || raw.mobile || raw.celular || undefined;
}

export function extractPatientDocument(raw: any): string | undefined {
    if (!raw) return undefined;
    return raw.cpf || raw.document || raw.rg || raw.documentNumber || undefined;
}

// ============================================================
// Extratores internos
// ============================================================

function extractFinancials(raw: any): Pick<PatientDTO, 'debt' | 'totalPending' | 'particularPending' | 'convenioPending'> {
    const balanceCurrent = typeof raw.balance?.current === 'number' ? raw.balance.current : undefined;
    const statsTotalPending = typeof raw.stats?.totalPending === 'number' ? raw.stats.totalPending : undefined;
    const statsTotalPendingParticular = typeof raw.stats?.totalPendingParticular === 'number' ? raw.stats.totalPendingParticular : undefined;

    const legacyBalance = typeof raw.balance === 'number' ? raw.balance : undefined;
    const legacyPending = typeof raw.pendingAmount === 'number' ? raw.pendingAmount : undefined;
    const legacyDebt = typeof raw.debt === 'number' ? raw.debt : undefined;

    const totalPending = statsTotalPending ?? legacyPending ?? legacyBalance ?? 0;
    const particularPending = statsTotalPendingParticular ?? balanceCurrent ?? legacyDebt ?? 0;
    const convenioPending = Math.max(0, totalPending - particularPending);
    const debt = particularPending;

    return {
        debt: Number(debt.toFixed(2)),
        totalPending: Number(totalPending.toFixed(2)),
        totalPendingParticular: Number(particularPending.toFixed(2)),
        particularPending: Number(particularPending.toFixed(2)),
        convenioPending: Number(convenioPending.toFixed(2)),
    };
}

function extractStats(raw: any): Pick<PatientDTO, 'totalAppointments' | 'totalCompleted' | 'totalCanceled' | 'totalNoShow' | 'totalPackages' | 'firstAppointmentDate' | 'lastAppointmentDate' | 'nextAppointmentDate'> {
    const stats = raw.stats || {};
    return {
        totalAppointments: stats.totalAppointments || 0,
        totalCompleted: stats.totalCompleted || 0,
        totalCanceled: stats.totalCanceled || 0,
        totalNoShow: stats.totalNoShow || 0,
        totalPackages: stats.totalPackages || 0,
        firstAppointmentDate: stats.firstAppointmentDate || raw.firstAppointmentDate || undefined,
        lastAppointmentDate: stats.lastAppointmentDate || raw.lastAppointmentDate || undefined,
        nextAppointmentDate: stats.nextAppointmentDate || raw.nextAppointmentDate || undefined,
    };
}

function extractPackages(raw: any): PatientPackageDTO[] | undefined {
    if (!Array.isArray(raw.packages)) return undefined;
    return raw.packages.map((pkg: any) => ({
        sessionType: pkg.sessionType || 'N/A',
        totalSessions: pkg.totalSessions || 0,
        sessionsDone: pkg.sessionsDone || 0,
        status: pkg.status || 'active',
    }));
}

function extractNextAppointment(raw: any): PatientNextAppointmentDTO | undefined {
    const apt = raw.nextAppointment;
    if (!apt) return undefined;
    const doctorName = apt.doctor?.fullName || apt.doctor?.name || apt.doctor?.nome || undefined;
    return {
        date: apt.date || undefined,
        doctor: apt.doctor ? {
            name: doctorName,
            fullName: doctorName, // compatibilidade
            specialty: apt.doctor.specialty || apt.doctor.specialties?.[0] || undefined,
        } : undefined,
    };
}

function extractLastAppointment(raw: any): PatientDTO['lastAppointment'] {
    const apt = raw.lastAppointment;
    if (!apt) return undefined;
    return {
        doctor: apt.doctor ? {
            specialty: apt.doctor.specialty || apt.doctor.specialties?.[0] || undefined,
        } : undefined,
    };
}

function extractHealthPlan(raw: any): PatientHealthPlanDTO | undefined {
    if (!raw.healthPlan) return undefined;
    return { name: raw.healthPlan.name || undefined };
}

// ============================================================
// Mapeadores principais
// ============================================================

export function mapPatientResponseDTO(raw: any): PatientDTO {
    if (!raw) {
        return {
            id: '',
            name: 'Desconhecido',
            debt: 0,
            totalPending: 0,
            particularPending: 0,
            convenioPending: 0,
            totalAppointments: 0,
            totalCompleted: 0,
            totalCanceled: 0,
            totalNoShow: 0,
            totalPackages: 0,
            raw: null,
        };
    }

    const id = extractPatientId(raw);
    const name = extractPatientName(raw);
    return {
        id,
        name,
        fullName: name,                    // compatibilidade
        patientId: id,                     // compatibilidade
        email: raw.email || undefined,
        phone: extractPatientPhone(raw),
        document: extractPatientDocument(raw),
        dateOfBirth: raw.dateOfBirth || raw.birthDate || undefined,
        ...extractFinancials(raw),
        ...extractStats(raw),
        packages: extractPackages(raw),
        nextAppointment: extractNextAppointment(raw),
        lastAppointment: extractLastAppointment(raw),
        healthPlan: extractHealthPlan(raw),
        tags: Array.isArray(raw.tags) ? raw.tags : undefined,
        raw,
    };
}

export function mapPatientListResponseDTO(rawList: any[]): PatientDTO[] {
    if (!Array.isArray(rawList)) return [];
    return rawList.map(mapPatientResponseDTO);
}
