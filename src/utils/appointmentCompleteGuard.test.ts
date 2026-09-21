import { describe, expect, it, vi } from 'vitest';
import {
    GuardErrorCodes,
    canAddToPatientBalance,
    validateAppointmentComplete,
} from './appointmentCompleteGuard';

// O guard loga INPUT a cada chamada — silencia para não poluir a saída dos testes.
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('validateAppointmentComplete — saldo devedor (conta corrente)', () => {
    it('particular avulso sem valor cadastrado, sem saldo devedor → bloqueia', () => {
        const result = validateAppointmentComplete({ billingType: 'particular', sessionValue: null });
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(GuardErrorCodes.SESSION_VALUE_REQUIRED);
    });

    it('particular avulso sem valor cadastrado, COM saldo devedor e valor declarado → passa', () => {
        // Caso Isis (sexta): sessão marcada como "Faltou" sem valor no agendamento,
        // secretária declara R$ 160 em "Valor a Registrar".
        const result = validateAppointmentComplete({
            billingType: 'particular',
            sessionValue: null,
            addToBalance: true,
            balanceAmount: 160,
        });
        expect(result).toEqual({ valid: true });
    });

    it('saldo devedor com valor zero → bloqueia com código próprio', () => {
        const result = validateAppointmentComplete({
            billingType: 'particular',
            sessionValue: null,
            addToBalance: true,
            balanceAmount: 0,
        });
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(GuardErrorCodes.BALANCE_AMOUNT_REQUIRED);
    });

    it('pacote per-session aceita saldo devedor', () => {
        const result = validateAppointmentComplete({
            billingType: 'particular',
            package: { _id: 'p1', paymentType: 'per-session', totalSessions: 4, sessionsDone: 1 },
            addToBalance: true,
            balanceAmount: 150,
        });
        expect(result.valid).toBe(true);
    });

    it.each(['full', 'installment'])('pacote pré-pago/parcelado (%s) NÃO aceita saldo devedor', (paymentType) => {
        const result = validateAppointmentComplete({
            billingType: 'particular',
            package: { _id: 'p1', paymentType, totalSessions: 4, sessionsDone: 1 },
            addToBalance: true,
            balanceAmount: 150,
        });
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(GuardErrorCodes.BALANCE_NOT_ALLOWED);
    });

    it('convênio e liminar NÃO aceitam saldo devedor', () => {
        const convenio = validateAppointmentComplete({ billingType: 'convenio', addToBalance: true, balanceAmount: 100 });
        const liminar = validateAppointmentComplete({
            billingType: 'liminar',
            liminarContract: { _id: 'c1', creditBalance: 1000 },
            sessionValue: 100,
            addToBalance: true,
            balanceAmount: 100,
        });
        expect(convenio.errorCode).toBe(GuardErrorCodes.BALANCE_NOT_ALLOWED);
        expect(liminar.errorCode).toBe(GuardErrorCodes.BALANCE_NOT_ALLOWED);
    });

    it('sem saldo devedor, o comportamento anterior é preservado', () => {
        expect(validateAppointmentComplete({ billingType: 'particular', sessionValue: 160 }).valid).toBe(true);
        expect(validateAppointmentComplete({ billingType: 'convenio' }).valid).toBe(true);
        expect(
            validateAppointmentComplete({ billingType: 'particular', package: { _id: 'p1', totalSessions: 4, sessionsDone: 4 } }).errorCode
        ).toBe(GuardErrorCodes.PACKAGE_EXHAUSTED);
    });
});

describe('canAddToPatientBalance', () => {
    it('particular avulso → permite', () => {
        expect(canAddToPatientBalance({ billingType: 'particular' })).toBe(true);
    });

    it('pacote sem informação de tipo (não populado) → permite; backend decide', () => {
        expect(canAddToPatientBalance({ billingType: 'particular', package: 'abc123' })).toBe(true);
        expect(canAddToPatientBalance({ billingType: 'particular', package: { _id: 'legacy' } })).toBe(true);
    });

    it('pacote model=per_session → permite; model=prepaid → bloqueia', () => {
        expect(canAddToPatientBalance({ package: { _id: 'p', model: 'per_session' } })).toBe(true);
        expect(canAddToPatientBalance({ package: { _id: 'p', model: 'prepaid' } })).toBe(false);
    });
});
