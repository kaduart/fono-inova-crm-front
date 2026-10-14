import { describe, expect, it } from 'vitest';
import { maskDateBR, pickerDateToStoredBirth, storedBirthToPickerDate } from './dateOfBirth';

describe('maskDateBR', () => {
    it('digitar 14101985 vira 14/10/1985 (pula para a próxima casa sozinho)', () => {
        expect(maskDateBR('14101985')).toBe('14/10/1985');
    });

    it('formata enquanto digita, sem barra sobrando no fim', () => {
        expect(maskDateBR('1')).toBe('1');
        expect(maskDateBR('14')).toBe('14');
        expect(maskDateBR('141')).toBe('14/1');
        expect(maskDateBR('1410')).toBe('14/10');
        expect(maskDateBR('14101')).toBe('14/10/1');
    });

    it('apagar volta limpo (14/ → 14) e ignora letras e excesso', () => {
        expect(maskDateBR('14/')).toBe('14');
        expect(maskDateBR('14/1a0/19x85999')).toBe('14/10/1985');
        expect(maskDateBR('')).toBe('');
    });

    it('já formatado continua igual', () => {
        expect(maskDateBR('14/10/1985')).toBe('14/10/1985');
    });
});

describe('pickerDateToStoredBirth', () => {
    it('grava meia-noite UTC do dia escolhido, qualquer que seja a hora do clique', () => {
        const noite = new Date(1985, 9, 14, 22, 30); // 14/10/1985 22:30 local
        expect(pickerDateToStoredBirth(noite)?.toISOString()).toBe('1985-10-14T00:00:00.000Z');
    });

    it('null/inválido → null', () => {
        expect(pickerDateToStoredBirth(null)).toBeNull();
        expect(pickerDateToStoredBirth(new Date('x'))).toBeNull();
    });
});

describe('storedBirthToPickerDate', () => {
    it('lê o dia em UTC: 00:00Z, 03:00Z e 23:53Z mostram o MESMO dia 14', () => {
        for (const iso of ['1985-10-14T00:00:00.000Z', '1985-10-14T03:00:00.000Z', '1985-10-14T23:53:32.000Z']) {
            const d = storedBirthToPickerDate(iso)!;
            expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([1985, 9, 14]);
        }
    });

    it('ida e volta preserva o dia', () => {
        const back = pickerDateToStoredBirth(storedBirthToPickerDate('2022-10-14T00:00:00.000Z'));
        expect(back?.toISOString()).toBe('2022-10-14T00:00:00.000Z');
    });

    it('vazio/inválido → null', () => {
        expect(storedBirthToPickerDate(null)).toBeNull();
        expect(storedBirthToPickerDate('lixo')).toBeNull();
    });
});
