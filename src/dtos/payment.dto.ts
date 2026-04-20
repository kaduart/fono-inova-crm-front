/**
 * DTOs de Pagamento — Sanitização de payload para API V2
 *
 * Regras:
 * 1. patientId NUNCA pode ser string vazia (rejeitado pelo backend como INVALID_PATIENT_ID)
 * 2. doctorId e appointmentId: remove se string vazia
 * 3. amount é garantido como number >= 0
 * 4. paymentMethod é normalizado
 * 5. packageId e sessionId: remove se string vazia
 */

import { FinancialRecord } from '../services/paymentService';

// Valores válidos de paymentMethod no backend V2
const VALID_PAYMENT_METHODS = [
    'dinheiro',
    'pix',
    'credit_card',
    'debit_card',
    'bank_transfer',
    'card',
    'cartão',
    'transferência',
    'plano-unimed',
    'convenio',
] as const;

type ValidPaymentMethod = typeof VALID_PAYMENT_METHODS[number];

function normalizePaymentMethod(method?: string | null): ValidPaymentMethod {
    if (!method) return 'pix';

    const map: Record<string, ValidPaymentMethod> = {
        'credito': 'credit_card',
        'crédito': 'credit_card',
        'debito': 'debit_card',
        'débito': 'debit_card',
        'cartao': 'card',
        'cartão': 'card',
        'card': 'card',
        'dinheiro': 'dinheiro',
        'pix': 'pix',
        'transferencia': 'bank_transfer',
        'transferência': 'bank_transfer',
        'plano-unimed': 'plano-unimed',
        'convenio': 'convenio',
    };

    const normalized = map[method.toLowerCase().trim()];
    if (normalized) return normalized;
    if (VALID_PAYMENT_METHODS.includes(method as any)) return method as ValidPaymentMethod;
    return 'pix';
}

function isValidObjectId(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    if (value.trim() === '') return false;
    // MongoDB ObjectId = 24 hex chars
    return /^[0-9a-fA-F]{24}$/.test(value.trim());
}

// ============================================================
// Interfaces de saída
// ============================================================

export interface CreatePaymentDTO {
    type: string;
    patientId: string;
    amount: number;
    paymentMethod: string;
    notes?: string;
    doctorId?: string;
    appointmentId?: string;
    packageId?: string;
    sessionId?: string;
    billingType?: string;
}

export interface CreatePaymentMultiItemDTO {
    amount: number;
    paymentMethod: string;
    description: string;
    sessionId?: string;
    appointmentId?: string;
}

export interface CreatePaymentMultiDTO {
    payments: CreatePaymentMultiItemDTO[];
    totalAmount: number;
    debitIds: string[];
}

// ============================================================
// Funções de mapeamento
// ============================================================

/**
 * Extrai patientId válido de um FinancialRecord.
 * Retorna null se não for possível extrair um ObjectId válido.
 */
export function extractPatientId(record: Partial<FinancialRecord>): string | null {
    const candidates = [
        record.patientId,
        record.patient?._id,
        (record as any).patient,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && isValidObjectId(candidate)) {
            return candidate;
        }
    }

    return null;
}

/**
 * Extrai doctorId válido de um FinancialRecord.
 */
export function extractDoctorId(record: Partial<FinancialRecord>): string | null {
    const candidates = [
        record.doctorId,
        record.doctor?._id,
        (record as any).doctor,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && isValidObjectId(candidate)) {
            return candidate;
        }
    }

    return null;
}

/**
 * Extrai appointmentId válido de um FinancialRecord.
 */
export function extractAppointmentId(record: Partial<FinancialRecord>): string | null {
    const candidates = [
        record.__appointmentId,
        record.appointment?._id,
        (record as any).appointmentId,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && isValidObjectId(candidate)) {
            return candidate;
        }
    }

    return null;
}

/**
 * Extrai sessionId válido de um débito (pode ser string ou objeto populado).
 */
export function extractSessionId(raw: unknown): string | null {
    if (typeof raw === 'string' && isValidObjectId(raw)) return raw;
    if (raw && typeof raw === 'object' && '_id' in raw) {
        const id = (raw as any)._id;
        if (typeof id === 'string' && isValidObjectId(id)) return id;
    }
    return null;
}

/**
 * Mapeia FinancialRecord para payload V2 de criação de pagamento.
 * Garante que patientId é válido — lança erro se não for.
 */
export function mapToCreatePaymentDTO(data: Partial<FinancialRecord>): CreatePaymentDTO {
    const patientId = extractPatientId(data);

    if (!patientId) {
        throw new Error('INVALID_PATIENT_ID: Não foi possível extrair um patientId válido do registro financeiro');
    }

    const type = extractAppointmentId(data) ? 'appointment_payment' : 'standalone';

    const dto: CreatePaymentDTO = {
        type,
        patientId,
        amount: typeof data.amount === 'number' && !isNaN(data.amount) ? Math.max(0, data.amount) : 0,
        paymentMethod: normalizePaymentMethod(data.paymentMethod),
    };

    const doctorId = extractDoctorId(data);
    if (doctorId) dto.doctorId = doctorId;

    const appointmentId = extractAppointmentId(data);
    if (appointmentId) dto.appointmentId = appointmentId;

    const notes = data.notes || data.description;
    if (notes && notes.trim() !== '') dto.notes = notes.trim();

    const packageId = data.packageId || data.package?._id;
    if (typeof packageId === 'string' && isValidObjectId(packageId)) {
        dto.packageId = packageId;
    }

    const sessionId = extractSessionId(data.sessionId);
    if (sessionId) dto.sessionId = sessionId;

    if (data.billingType) dto.billingType = data.billingType;

    return dto;
}

/**
 * Substitui buildPaymentPayloadV2 legado.
 * Mais robusto e com validação de patientId.
 */
export function buildPaymentPayloadV2(data: Partial<FinancialRecord>): CreatePaymentDTO {
    return mapToCreatePaymentDTO(data);
}

/**
 * Mapeia um item de pagamento multi-débito.
 * Usado no PatientBalanceModal.
 */
export function mapToPaymentMultiItem(params: {
    amount: number;
    paymentMethod: string;
    description: string;
    sessionId?: unknown;
    appointmentId?: unknown;
}): CreatePaymentMultiItemDTO {
    const item: CreatePaymentMultiItemDTO = {
        amount: Math.max(0, params.amount),
        paymentMethod: normalizePaymentMethod(params.paymentMethod),
        description: params.description || '',
    };

    const sessionId = extractSessionId(params.sessionId);
    if (sessionId) item.sessionId = sessionId;

    const appointmentId = extractSessionId(params.appointmentId); // mesma lógica de validação
    if (appointmentId) item.appointmentId = appointmentId;

    return item;
}
