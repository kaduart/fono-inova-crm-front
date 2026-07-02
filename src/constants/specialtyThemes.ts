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
  border: '#A7F3D0',
  text: '#1B4D6E'
};

export const SPECIALTY_THEMES: Record<string, SpecialtyTheme> = {
  fonoaudiologia: { from: '#1D4ED8', to: '#38BDF8', light: '#EFF6FF', border: '#BAE6FD', text: '#1D4ED8' },
  psicologia: { from: '#7C3AED', to: '#C084FC', light: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9' },
  fisioterapia: { from: '#059669', to: '#34D399', light: '#ECFDF5', border: '#A7F3D0', text: '#047857' },
  psicomotricidade: { from: '#D97706', to: '#FCD34D', light: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
  terapia_ocupacional: { from: '#EA580C', to: '#FB923C', light: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
  psicopedagogia: { from: '#0D9488', to: '#2DD4BF', light: '#F0FDFA', border: '#99F6E4', text: '#0F766E' },
  neuropsicologia: { from: '#4338CA', to: '#818CF8', light: '#EEF2FF', border: '#C7D2FE', text: '#3730A3' },
  musicoterapia: { from: '#B45309', to: '#FBBF24', light: '#FFFBEB', border: '#FDE68A', text: '#92400E' }
};

export function getSpecialtyTheme(specialty: string): SpecialtyTheme {
  return SPECIALTY_THEMES[specialty] || DEFAULT_SPECIALTY_THEME;
}
