export function getInsuranceGuideNumber(value: any): string | null {
  const number = value?.insuranceGuideNumber || value?.insuranceGuide?.number ||
    value?.extendedProps?.insuranceGuideNumber || value?.extendedProps?.insuranceGuide?.number;
  return number == null || String(number).trim() === '' ? null : String(number);
}
