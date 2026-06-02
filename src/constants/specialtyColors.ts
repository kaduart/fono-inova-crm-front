/**
 * 🎨 Cores por especialidade para avatares, badges e identidade visual.
 * Cada especialidade tem uma cor fixa para reconhecimento imediato.
 */

export const SPECIALTY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    fonoaudiologia:      { bg: 'bg-emerald-100',  text: 'text-emerald-700',  border: 'border-emerald-200',  dot: 'bg-emerald-500' },
    psicologia:          { bg: 'bg-purple-100',   text: 'text-purple-700',   border: 'border-purple-200',   dot: 'bg-purple-500' },
    fisioterapia:        { bg: 'bg-rose-100',     text: 'text-rose-700',     border: 'border-rose-200',     dot: 'bg-rose-500' },
    terapia_ocupacional: { bg: 'bg-amber-100',    text: 'text-amber-700',    border: 'border-amber-200',    dot: 'bg-amber-500' },
    neuroped:            { bg: 'bg-sky-100',      text: 'text-sky-700',      border: 'border-sky-200',      dot: 'bg-sky-500' },
    psicomotricidade:    { bg: 'bg-pink-100',     text: 'text-pink-700',     border: 'border-pink-200',     dot: 'bg-pink-500' },
    musicoterapia:       { bg: 'bg-orange-100',   text: 'text-orange-700',   border: 'border-orange-200',   dot: 'bg-orange-500' },
    psicopedagogia:      { bg: 'bg-teal-100',     text: 'text-teal-700',     border: 'border-teal-200',     dot: 'bg-teal-500' },
    neuropsicologia:     { bg: 'bg-indigo-100',   text: 'text-indigo-700',   border: 'border-indigo-200',   dot: 'bg-indigo-500' },
    pediatria:           { bg: 'bg-cyan-100',     text: 'text-cyan-700',     border: 'border-cyan-200',     dot: 'bg-cyan-500' },
};

/**
 * Retorna a configuração de cor de uma especialidade.
 * Se não encontrar, retorna cinza neutro.
 */
export const getSpecialtyColor = (specialty?: string) => {
    if (!specialty) return {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-200',
        dot: 'bg-gray-400'
    };
    return SPECIALTY_COLORS[specialty] || {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-200',
        dot: 'bg-gray-400'
    };
};

/**
 * Extrai iniciais de um nome completo.
 * Ex: "Ana Paula Silva" → "APS"
 * Ex: "Luis Henrique" → "LH"
 */
export const getInitials = (name?: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
