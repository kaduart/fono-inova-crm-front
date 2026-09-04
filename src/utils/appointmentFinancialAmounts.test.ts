import { describe, expect, it } from 'vitest';
import {
    buildParticularCompletionAmounts,
    resolveAppointmentFinancialAmounts,
} from './appointmentFinancialAmounts';

describe('appointmentFinancialAmounts', () => {
    it('uses the canonical backend balance for a consultation with deposit', () => {
        expect(resolveAppointmentFinancialAmounts({
            sessionValue: 500,
            depositAmount: 50,
            remainingAmount: 450,
        })).toEqual({
            sessionValue: 500,
            depositAmount: 50,
            amountDueNow: 450,
            hasCanonicalBalance: true,
        });
    });

    it('keeps the legacy amount when the backend has no canonical balance', () => {
        expect(resolveAppointmentFinancialAmounts({ sessionValue: 500 })).toEqual({
            sessionValue: 500,
            depositAmount: 0,
            amountDueNow: 500,
            hasCanonicalBalance: false,
        });
    });

    it('sends only the balance as payment while preserving the clinical value', () => {
        expect(buildParticularCompletionAmounts(500, 450, [{ amount: 200 }, { amount: 250 }])).toEqual({
            sessionValue: 500,
            paymentAmount: 450,
        });
    });
});
