type FinancialAppointment = {
    sessionValue?: number | null;
    paymentAmount?: number | null;
    depositAmount?: number | null;
    remainingAmount?: number | null;
};

export function resolveAppointmentFinancialAmounts(appointment?: FinancialAppointment | null) {
    const sessionValue = Number(appointment?.sessionValue ?? appointment?.paymentAmount ?? 0);
    const depositAmount = Number(appointment?.depositAmount ?? 0);
    const hasCanonicalBalance = typeof appointment?.remainingAmount === 'number';
    const amountDueNow = hasCanonicalBalance
        ? Number(appointment?.remainingAmount)
        : sessionValue;

    return { sessionValue, depositAmount, amountDueNow, hasCanonicalBalance };
}

export function buildParticularCompletionAmounts(
    sessionValue: number,
    amountDueNow: number,
    payments?: Array<{ amount: number }>
) {
    const receivedNow = payments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || amountDueNow;
    return {
        sessionValue: Number(sessionValue || 0),
        paymentAmount: receivedNow,
    };
}
