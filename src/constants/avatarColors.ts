// Cor do avatar derivada da primeira letra do nome.
//
// Mesma paleta e mesma regra já usadas em PerformancePorProfissional e
// ListaPacientesVIP: o mesmo profissional/paciente mantém a mesma cor em todas
// as telas. Novas telas devem reutilizar este util em vez de copiar a paleta.

export interface AvatarColor {
    bg: string;
    text: string;
}

export const AVATAR_COLORS: readonly AvatarColor[] = [
    { bg: 'var(--fx-indigo-100)', text: '#4F46E5' },
    { bg: '#FCE7F3', text: '#BE185D' },
    { bg: 'var(--fx-emerald-100)', text: 'var(--fx-emerald-700)' },
    { bg: 'var(--fx-amber-100)', text: 'var(--fx-amber-700)' },
    { bg: 'var(--fx-sky-100)', text: 'var(--fx-sky-700)' },
    { bg: 'var(--fx-purple-100)', text: '#7C3AED' }
];

export const getAvatarColor = (name?: string): AvatarColor => {
    const first = name?.trim().charCodeAt(0);
    if (first === undefined || Number.isNaN(first)) return AVATAR_COLORS[0];
    return AVATAR_COLORS[first % AVATAR_COLORS.length];
};
