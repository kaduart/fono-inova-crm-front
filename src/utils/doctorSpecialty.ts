/**
 * Profissional × especialidade — usado para AVISAR sobre combinações como
 * "Luis Henrique (Terapia Ocupacional) + pacote de Fonoaudiologia" (não bloqueia:
 * psicólogos com pacote de psicopedagogia/neuropsicologia são prática real).
 *
 * Mesma regra já usada no modal de agendamento (appointmentDetailModal.tsx):
 * bate com `specialty` OU qualquer item de `specialties`. Profissional sem
 * nenhuma especialidade cadastrada é tratado como "não sei" → permite.
 */

export interface DoctorWithSpecialty {
  specialty?: string | null;
  specialties?: string[] | null;
}

/** 'terapia_ocupacional' | 'Terapia Ocupacional' → 'terapia ocupacional' */
export function normalizeSpecialty(value?: string | null): string {
  return (value || '').toLowerCase().replace(/_/g, ' ').trim();
}

export function doctorHandlesSpecialty(
  doctor: DoctorWithSpecialty | null | undefined,
  specialty?: string | null
): boolean {
  if (!doctor || !specialty) return true;

  const target = normalizeSpecialty(specialty);
  const own = [doctor.specialty, ...(doctor.specialties || [])]
    .map(normalizeSpecialty)
    .filter(Boolean);

  if (own.length === 0) return true;
  return own.includes(target);
}
