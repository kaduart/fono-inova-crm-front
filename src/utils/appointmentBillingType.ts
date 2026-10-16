/** Resolução compartilhada; extraída sem alterar a precedência financeira existente. */
export function resolveBillingType(data: {
    billingType?: string | null;
    paymentMethod?: string | null;
    payment?: { type?: string } | null;
    liminarContract?: any;
    insuranceGuide?: string | null;
    insuranceGuideId?: string | null;
    insurancePlan?: string | null;
    extendedProps?: { insuranceGuide?: any } | null;
}): 'particular' | 'convenio' | 'liminar' {
    const hasInsuranceGuide = !!(
        data.insuranceGuide ||
        data.insuranceGuideId ||
        data.insurancePlan ||
        data.extendedProps?.insuranceGuide
    );

    if (data.liminarContract) return 'liminar';
    if (data.billingType === 'liminar') return 'liminar';
    if (data.billingType === 'convenio') return 'convenio';
    if (data.paymentMethod === 'convenio') return 'convenio';
    if (hasInsuranceGuide) return 'convenio';

    const value = data.billingType ?? data.payment?.type;
    if (value === 'liminar') return 'liminar';
    if (value === 'convenio') return 'convenio';

    return 'particular';
}
