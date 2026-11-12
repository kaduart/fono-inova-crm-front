// Candidatos a neuro: rótulos, cores e o texto de oferta para a família.
// Regras do texto: valor antes do preço; consulta SÓ PARTICULAR; nunca citar nome nem quantidade de
// profissionais; não afirmar diagnóstico ("seu filho tem autismo") — quem avalia é o neuropediatra.
import type { NeuroReferral, NeuroReferralPatient, NeuroReferralReason, NeuroReferralStatus } from '../services/neuroReferralService';

export const NEURO_STATUS_META: Record<NeuroReferralStatus, { label: string; color: 'default' | 'warning' | 'info' | 'primary' | 'success' | 'error' }> = {
  a_confirmar: { label: 'A confirmar (terapeuta)', color: 'warning' },
  indicado: { label: 'Oferecer', color: 'primary' },
  oferecido: { label: 'Oferecido', color: 'info' },
  agendado: { label: 'Agendou', color: 'success' },
  recusado: { label: 'Recusou', color: 'error' },
  ja_tem_laudo: { label: 'Já tem laudo', color: 'default' },
  descartado: { label: 'Sem indicação', color: 'default' },
};

export const NEURO_REASON_LABELS: Record<NeuroReferralReason, string> = {
  tea: 'Sinais de TEA',
  tdah: 'Sinais de TDAH',
  atraso_desenvolvimento: 'Atraso no desenvolvimento',
  outro: 'Outro',
};

export const NEURO_SPECIALTY_LABELS: Record<string, string> = {
  fonoaudiologia: 'Fono',
  psicologia: 'Psico',
  terapia_ocupacional: 'TO',
};

export const NEURO_MATCHED_IN_LABELS: Record<string, string> = {
  queixa_paciente: 'queixa do cadastro',
  queixa_agendamento: 'queixa no agendamento',
  anamnese: 'anamnese',
};

export const patientOf = (r: NeuroReferral): NeuroReferralPatient | null =>
  (r.patient && typeof r.patient === 'object' ? r.patient : null);

const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || '';

/** Mensagem para a família (WhatsApp). Sem preço: a recepção informa o valor depois de explicar o benefício. */
export const buildNeuroOfferMessage = (patient: Pick<NeuroReferralPatient, 'fullName' | 'legalGuardian'>): string => {
  const guardian = firstName(patient.legalGuardian);
  const child = firstName(patient.fullName);
  return [
    `Oi${guardian ? `, ${guardian}` : ''}! Aqui é da Clínica Fono Inova.`,
    `A equipe que acompanha ${child || 'seu filho(a)'} sugeriu uma consulta com o neuropediatra: ele avalia o desenvolvimento como um todo e, quando indicado, emite o laudo, que ajuda nos direitos na escola e a direcionar a terapia.`,
    'A consulta é particular. Posso te mandar o valor e os horários disponíveis? 💚',
  ].join(' ');
};

export const buildNeuroWhatsAppUrl = (patient: NeuroReferralPatient): string | null => {
  const digits = (patient.phone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(buildNeuroOfferMessage(patient))}`;
};

export const ageLabel = (dateOfBirth?: string | null): string | null => {
  const m = dateOfBirth ? /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth) : null;
  if (!m) return null;
  const now = new Date();
  let age = now.getFullYear() - Number(m[1]);
  const mm = now.getMonth() + 1 - Number(m[2]);
  if (mm < 0 || (mm === 0 && now.getDate() < Number(m[3]))) age -= 1;
  if (age < 0 || age > 120) return null;
  return `${age} ${age === 1 ? 'ano' : 'anos'}`;
};
