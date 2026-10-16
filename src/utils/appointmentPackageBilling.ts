interface PackageContext {
    billingType?: string;
    liminarContract?: unknown;
    paymentOrigin?: string;
    serviceType?: string;
    package?: string | { model?: string; paymentType?: string; financialStatus?: string } | null;
    extendedProps?: { paymentOrigin?: string; package?: PackageContext['package']; packageId?: string; __isPackageAppointment?: boolean };
}
/** Mesmos discriminadores do ParticularHandler. Vínculo com pacote, sozinho, não prova pré-pagamento. */
export function isPrepaidPackageAppointment(appointment: PackageContext): boolean {
    if (appointment.billingType === 'convenio' || appointment.billingType === 'liminar' || appointment.liminarContract) return false;
    const pkg = appointment.package || appointment.extendedProps?.package;
    if (pkg && typeof pkg === 'object') {
        if (pkg.model === 'per_session' || pkg.paymentType === 'per-session' || pkg.paymentType === 'per_session') return false;
        if (pkg.model === 'prepaid' || pkg.paymentType === 'full') return true;
    }
    return (appointment.paymentOrigin || appointment.extendedProps?.paymentOrigin) === 'package_prepaid';
}
