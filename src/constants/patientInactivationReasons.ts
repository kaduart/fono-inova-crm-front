/**
 * Motivos de inativação do paciente (Kadu, 09/11/2026). Mesma lista do back
 * (domain/patient/inactivationReasons.js): a chave é o que fica no banco e
 * serve para filtrar campanhas de retorno.
 */
export const PATIENT_INACTIVATION_REASONS = {
  alta: 'Alta / objetivo atingido',
  financeiro: 'Financeiro / preço',
  horario: 'Horário ou distância',
  mudou_cidade: 'Mudou de cidade',
  saude: 'Saúde / cirurgia',
  convenio: 'Convênio (não cobre ou mudou)',
  outra_clinica: 'Foi para outra clínica',
  insatisfacao: 'Insatisfação',
  sem_resposta: 'Parou de responder',
  outro: 'Outro',
} as const;

export type PatientInactivationReason = keyof typeof PATIENT_INACTIVATION_REASONS;

export function inactivationReasonLabel(reason?: string | null): string {
  if (!reason) return '';
  return (PATIENT_INACTIVATION_REASONS as Record<string, string>)[reason] || reason;
}
