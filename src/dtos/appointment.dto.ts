/**
 * DTOs de Agendamento — Sanitização de payload para API V2
 *
 * Regras:
 * 1. Campos de convênio SÓ são enviados quando billingType === 'convenio'
 * 2. paymentMethod é normalizado para valores válidos do backend
 * 3. duration é removido (backend V2 não utiliza)
 * 4. packageId: null é removido
 * 5. Valores vazios ('', 0, null) de campos opcionais são omitidos
 */

import { ScheduleAppointment } from '../utils/types/types';

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

/**
 * Normaliza paymentMethod para um valor aceito pelo backend.
 * Fallback: 'pix'
 */
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

    // Se já é um dos válidos diretos
    if (VALID_PAYMENT_METHODS.includes(method as any)) return method as ValidPaymentMethod;

    return 'pix';
}

/**
 * Verifica se um valor é "vazio" (string vazia, null, undefined, NaN)
 */
function isEmptyValue(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (typeof value === 'number' && (isNaN(value) || value === 0)) return true;
    return false;
}

/**
 * Cria um objeto limpo removendo campos vazios recursivamente (nível 1)
 */
function cleanObject<T extends Record<string, any>>(obj: T, preserveZeroFields: string[] = []): Partial<T> {
    const result: Partial<T> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (preserveZeroFields.includes(key)) {
            if (value !== undefined && value !== null) {
                (result as any)[key] = value;
            }
            continue;
        }
        if (!isEmptyValue(value)) {
            (result as any)[key] = value;
        }
    }
    return result;
}

// ============================================================
// Interfaces de saída (payload sanitizado para API)
// ============================================================

export interface CreateAppointmentDTO {
    patientId: string;
    doctorId: string;
    date: string | Date;
    time?: string;
    specialty?: string;
    sessionType?: string;
    serviceType?: string;
    notes?: string;
    reason?: string;
    operationalStatus?: string;
    clinicalStatus?: string;
    billingType?: string;
    paymentAmount?: number;
    sessionValue?: number;
    paymentMethod?: string;
    packageId?: string;
    // Convênio (só quando billingType === 'convenio')
    insuranceProvider?: string;
    insuranceValue?: number;
    authorizationCode?: string;
    insurance?: {
        provider: string;
        grossAmount: number;
        authorizationCode?: string | null;
        status?: string;
    };
}

export interface UpdateAppointmentDTO {
    doctorId?: string;
    patientId?: string;
    date?: string | Date;
    time?: string;
    notes?: string;
    reason?: string;
    specialty?: string;
    sessionType?: string;
    serviceType?: string;
    operationalStatus?: string;
    clinicalStatus?: string;
    billingType?: string;
    paymentAmount?: number;
    sessionValue?: number;
    paymentMethod?: string;
    packageId?: string;
    // Convênio (só quando billingType === 'convenio')
    insuranceProvider?: string;
    insuranceValue?: number;
    authorizationCode?: string;
    insurance?: {
        provider: string;
        grossAmount: number;
        authorizationCode?: string | null;
        status?: string;
    } | null;
}

// ============================================================
// Funções de mapeamento
// ============================================================

/**
 * Mapeia dados do formulário de agendamento para DTO de criação.
 * Remove campos de convênio quando não aplicáveis.
 */
export function mapToCreateAppointmentDTO(data: Partial<ScheduleAppointment> & Record<string, any>): CreateAppointmentDTO {
    const isConvenio = data.billingType === 'convenio';

    const dto: CreateAppointmentDTO = {
        patientId: data.patientId || '',
        doctorId: data.doctorId || '',
        date: data.date || new Date().toISOString(),
        time: data.time || '',
        specialty: data.specialty || data.sessionType,
        sessionType: data.sessionType,
        serviceType: data.serviceType,
        notes: data.notes,
        reason: data.reason,
        operationalStatus: data.operationalStatus,
        clinicalStatus: data.clinicalStatus,
        billingType: data.billingType || 'particular',
        paymentAmount: data.paymentAmount,
        sessionValue: data.sessionValue ?? data.paymentAmount,
        paymentMethod: normalizePaymentMethod(data.paymentMethod),
    };

    // packageId: só inclui se for string válida (não null)
    if (typeof data.packageId === 'string' && data.packageId.trim() !== '') {
        dto.packageId = data.packageId;
    }

    // Convênio: só inclui campos se billingType === 'convenio'
    if (isConvenio) {
        if (data.insuranceProvider) {
            dto.insuranceProvider = data.insuranceProvider;
        }
        if (typeof data.insuranceValue === 'number' && data.insuranceValue > 0) {
            dto.insuranceValue = data.insuranceValue;
        }
        if (data.authorizationCode) {
            dto.authorizationCode = data.authorizationCode;
        }
        if (data.insurance?.provider || data.insuranceProvider) {
            dto.insurance = {
                provider: data.insurance?.provider || data.insuranceProvider || '',
                grossAmount: data.insurance?.grossAmount ?? data.insuranceValue ?? 0,
                authorizationCode: data.insurance?.authorizationCode ?? data.authorizationCode ?? null,
                status: data.insurance?.status || 'pending_billing',
            };
        }
    }

    return cleanObject(dto, ['paymentAmount', 'sessionValue']) as CreateAppointmentDTO;
}

/**
 * Mapeia dados do formulário de agendamento para DTO de atualização.
 * Remove campos de convênio quando não aplicáveis.
 * Omite campos vazios para não sobrescrever dados existentes no backend.
 */
export function mapToUpdateAppointmentDTO(data: Partial<ScheduleAppointment> & Record<string, any>): UpdateAppointmentDTO {
    const isConvenio = data.billingType === 'convenio';

    const dto: UpdateAppointmentDTO = cleanObject({
        doctorId: data.doctorId,
        patientId: data.patientId,
        date: data.date,
        time: data.time,
        notes: data.notes,
        reason: data.reason,
        specialty: data.specialty || data.sessionType,
        sessionType: data.sessionType,
        serviceType: data.serviceType,
        operationalStatus: data.operationalStatus,
        clinicalStatus: data.clinicalStatus,
        billingType: data.billingType || 'particular',
        paymentAmount: data.paymentAmount,
        sessionValue: data.sessionValue ?? data.paymentAmount,
        paymentMethod: data.paymentMethod ? normalizePaymentMethod(data.paymentMethod) : undefined,
        packageId: typeof data.packageId === 'string' && data.packageId.trim() !== '' ? data.packageId : undefined,
    }) as UpdateAppointmentDTO;

    // Convênio: só inclui se billingType === 'convenio'
    if (isConvenio) {
        if (data.insuranceProvider) {
            dto.insuranceProvider = data.insuranceProvider;
        }
        if (typeof data.insuranceValue === 'number' && data.insuranceValue > 0) {
            dto.insuranceValue = data.insuranceValue;
        }
        if (data.authorizationCode) {
            dto.authorizationCode = data.authorizationCode;
        }
        if (data.insurance?.provider || data.insuranceProvider) {
            dto.insurance = {
                provider: data.insurance?.provider || data.insuranceProvider || '',
                grossAmount: data.insurance?.grossAmount ?? data.insuranceValue ?? 0,
                authorizationCode: data.insurance?.authorizationCode ?? data.authorizationCode ?? null,
                status: data.insurance?.status || 'pending_billing',
            };
        }
    } else if (data.billingType && data.billingType !== 'convenio') {
        // Se está mudando DE convênio PARA outro tipo, explicitamente limpa insurance
        dto.insurance = null;
    }

    return dto;
}

/**
 * Sanitiza payload genérico de agendamento (usado em services legados).
 * Remove campos conhecidos como 'sujeira', undefined, e normaliza enums.
 */
export function sanitizeAppointmentPayload(payload: Record<string, any>): Record<string, any> {
    const { duration, __isPreAgendamento, __hasPayment, extendedProps, ...rest } = payload;

    // Remove explicitamente chaves com undefined (não serializáveis de forma previsível)
    const sanitized = Object.fromEntries(
        Object.entries(rest).filter(([_, v]) => v !== undefined)
    ) as Record<string, any>;

    // Fallback seguro para billingType
    if (!sanitized.billingType || typeof sanitized.billingType !== 'string') {
        sanitized.billingType = 'particular';
    }

    // Normaliza paymentMethod
    if (sanitized.paymentMethod) {
        sanitized.paymentMethod = normalizePaymentMethod(sanitized.paymentMethod);
    }

    // Remove packageId: null
    if (sanitized.packageId === null) {
        delete sanitized.packageId;
    }

    // Remove campos de convênio quando não é convênio
    if (sanitized.billingType !== 'convenio') {
        delete sanitized.insuranceProvider;
        delete sanitized.insuranceValue;
        delete sanitized.authorizationCode;
        delete sanitized.insurance;
    }

    return sanitized;
}
