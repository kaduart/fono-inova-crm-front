import { THERAPY_TYPES } from '../utils/types/types';

/**
 * Labels extras encontrados em telas específicas (calendário, liminar, etc.)
 * que não fazem parte do THERAPY_TYPES canônico.
 */
const EXTRA_LABELS: Record<string, string> = {
    aba: 'ABA',
    nutricao: 'Nutrição',
    psiquiatria: 'Psiquiatria',
    geral: 'Clínico Geral',
    neuropediatria: 'Neuropediatria',
    'N/A': 'Outros',
    outros: 'Outros',
};

/**
 * Mapa de especialidade → label legível.
 * Ex: terapia_ocupacional → Terapia Ocupacional
 */
export const SPECIALTY_LABELS: Record<string, string> = {
    ...THERAPY_TYPES.reduce(
        (acc, t) => {
            acc[t.value] = t.label;
            return acc;
        },
        {} as Record<string, string>
    ),
    ...EXTRA_LABELS,
};

/**
 * Lista de valores (slugs) das especialidades canônicas.
 */
export const SPECIALTY_VALUES: string[] = THERAPY_TYPES.map((t) => t.value);

/**
 * Array no formato { value, label } usado em selects/forms.
 */
export const SPECIALTY_OPTIONS = [
    ...THERAPY_TYPES,
];

/**
 * Retorna o label bonito de uma especialidade.
 * Se não estiver no mapa, faz um capitalize simples.
 */
export const getSpecialtyLabel = (specialty?: string): string => {
    if (!specialty) return 'N/A';
    return SPECIALTY_LABELS[specialty] || specialty.charAt(0).toUpperCase() + specialty.slice(1);
};
