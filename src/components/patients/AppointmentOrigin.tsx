import { getInsuranceGuideNumber } from '../../utils/insuranceGuideNumber';

const referenceId = (value: any): string | null => {
  const id = value?._id || value?.id || (typeof value === 'string' ? value : null);
  return id ? String(id) : null;
};

export function AppointmentOrigin({ appointment }: { appointment: any }) {
  const guideNumber = getInsuranceGuideNumber(appointment);
  const guideId = referenceId(appointment.insuranceGuide) || appointment.insuranceGuideId;
  const packageId = referenceId(appointment.package) || appointment.packageId;
  const contractId = referenceId(appointment.liminarContract) || appointment.liminarContractId;
  const origins = [
    guideNumber ? { label: `Guia #${guideNumber}`, detail: `Guia #${guideNumber}${guideId ? ` (${guideId})` : ''}` } :
      guideId ? { label: 'Guia sem número', detail: `Guia vinculada: ${guideId}; número indisponível` } : null,
    packageId ? { label: appointment.packageNumber ? `Pacote ${appointment.packageNumber}` : 'Pacote', detail: `Pacote: ${packageId}${appointment.packageStatus ? `; status: ${appointment.packageStatus}` : ''}` } : null,
    contractId ? { label: appointment.liminarSpecialtyNumber ? `Liminar ${appointment.liminarSpecialtyNumber}` : 'Liminar', detail: `Contrato liminar: ${contractId}${appointment.liminarProcessNumber ? `; processo: ${appointment.liminarProcessNumber}` : ''}` } : null,
  ].filter((origin): origin is { label: string; detail: string } => Boolean(origin));
  if (!origins.length) {
    const label = appointment.billingType === 'convenio' || appointment.paymentMethod === 'convenio'
      ? 'Convênio · Guia não identificada'
      : appointment.billingType === 'liminar' || appointment.paymentMethod === 'liminar_credit'
        ? 'Liminar · Contrato não identificado'
        : appointment.billingType === 'particular' ? 'Particular · Avulso' : 'Origem não identificada';
    return <span className="text-[11px] leading-tight">{label}</span>;
  }
  return <div className="flex flex-col gap-0.5 text-[11px] font-semibold leading-tight whitespace-normal">
    {origins.map(origin => <span key={origin.label} title={origin.detail} className="break-words">{origin.label}</span>)}
  </div>;
}
