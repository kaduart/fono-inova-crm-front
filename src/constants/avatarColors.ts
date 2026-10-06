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
    { bg: '#E0E7FF', text: '#4F46E5' },
    { bg: '#FCE7F3', text: '#BE185D' },
    { bg: '#D1FAE5', text: '#047857' },
    { bg: '#FEF3C7', text: '#B45309' },
    { bg: '#E0F2FE', text: '#0369A1' },
    { bg: '#F3E8FF', text: '#7C3AED' }
];

export const getAvatarColor = (name?: string): AvatarColor => {
    const first = name?.trim().charCodeAt(0);
    if (first === undefined || Number.isNaN(first)) return AVATAR_COLORS[0];
    return AVATAR_COLORS[first % AVATAR_COLORS.length];
};
