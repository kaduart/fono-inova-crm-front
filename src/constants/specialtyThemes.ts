// src/constants/specialtyThemes.ts
// Paleta de cor por especialidade clínica, compartilhável entre telas (Convênio, Liminar, etc.)
// sem acoplar módulos diferentes entre si — cada consumidor importa direto daqui.

export interface SpecialtyTheme {
  from: string;
  to: string;
  light: string;
  border: string;
  text: string;
}

const DEFAULT_SPECIALTY_THEME: SpecialtyTheme = {
  from: '#1B4D6E',
  to: '#2E7A5E',
  light: '#F0FFF4',
  border: 'var(--fx-emerald-200)',
  text: '#1B4D6E'
};

export const SPECIALTY_THEMES: Record<string, SpecialtyTheme> = {
  fonoaudiologia: { from: '#1D4ED8', to: '#38BDF8', light: 'var(--fx-blue-50)', border: 'var(--fx-sky-200)', text: 'var(--fx-blue-700)' },
  psicologia: { from: '#7C3AED', to: '#C084FC', light: 'var(--fx-violet-50)', border: 'var(--fx-violet-200)', text: 'var(--fx-violet-700)' },
  fisioterapia: { from: '#059669', to: '#34D399', light: 'var(--fx-emerald-50)', border: 'var(--fx-emerald-200)', text: 'var(--fx-emerald-700)' },
  psicomotricidade: { from: '#D97706', to: '#FCD34D', light: 'var(--fx-amber-50)', border: 'var(--fx-amber-200)', text: 'var(--fx-amber-700)' },
  terapia_ocupacional: { from: '#EA580C', to: '#FB923C', light: 'var(--fx-orange-50)', border: 'var(--fx-orange-200)', text: 'var(--fx-orange-700)' },
  psicopedagogia: { from: '#0D9488', to: '#2DD4BF', light: 'var(--fx-teal-50)', border: '#99F6E4', text: 'var(--fx-teal-700)' },
  neuropsicologia: { from: '#4338CA', to: '#818CF8', light: 'var(--fx-indigo-50)', border: 'var(--fx-indigo-200)', text: 'var(--fx-indigo-800)' },
  musicoterapia: { from: '#B45309', to: '#FBBF24', light: 'var(--fx-amber-50)', border: 'var(--fx-amber-200)', text: 'var(--fx-amber-800)' }
};

export function getSpecialtyTheme(specialty: string): SpecialtyTheme {
  return SPECIALTY_THEMES[specialty] || DEFAULT_SPECIALTY_THEME;
}
