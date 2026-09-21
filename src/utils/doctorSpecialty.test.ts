import { describe, expect, it } from 'vitest';
import { doctorHandlesSpecialty, normalizeSpecialty } from './doctorSpecialty';

describe('doctorHandlesSpecialty', () => {
    const luis = { specialty: 'terapia_ocupacional' };

    it('profissional de TO NÃO atende pacote de fonoaudiologia (caso Luis Henrique / FONO-6)', () => {
        expect(doctorHandlesSpecialty(luis, 'fonoaudiologia')).toBe(false);
    });

    it('aceita a própria especialidade, ignorando caixa e underscore', () => {
        expect(doctorHandlesSpecialty(luis, 'terapia_ocupacional')).toBe(true);
        expect(doctorHandlesSpecialty(luis, 'Terapia Ocupacional')).toBe(true);
    });

    it('aceita especialidades adicionais', () => {
        expect(doctorHandlesSpecialty({ specialty: 'fonoaudiologia', specialties: ['psicomotricidade'] }, 'psicomotricidade')).toBe(true);
    });

    it('sem especialidade cadastrada ou sem alvo → permite (não sabe, não bloqueia)', () => {
        expect(doctorHandlesSpecialty({}, 'fonoaudiologia')).toBe(true);
        expect(doctorHandlesSpecialty(luis, '')).toBe(true);
        expect(doctorHandlesSpecialty(null, 'fonoaudiologia')).toBe(true);
    });

    it('normalizeSpecialty', () => {
        expect(normalizeSpecialty('  Terapia_Ocupacional ')).toBe('terapia ocupacional');
        expect(normalizeSpecialty(undefined)).toBe('');
    });
});
