// "Passou sem parabéns": últimos 7 dias, sem parabéns no ano (automático ou "Já dei"). Sem data fixa.
import { describe, expect, it } from 'vitest';
import { isLateBirthday } from '../BirthdayList';

describe('isLateBirthday', () => {
    it('passou há até 7 dias sem parabéns conta', () => {
        expect(isLateBirthday({ daysUntil: -1 })).toBe(true);
        expect(isLateBirthday({ daysUntil: -7 })).toBe(true);
    });
    it('mais de 7 dias, hoje ou futuro não conta', () => {
        expect(isLateBirthday({ daysUntil: -8 })).toBe(false);
        expect(isLateBirthday({ daysUntil: 0 })).toBe(false);
        expect(isLateBirthday({ daysUntil: 3 })).toBe(false);
    });
    it('quem recebeu ou foi marcado como parabenizado não conta', () => {
        expect(isLateBirthday({ daysUntil: -1, birthdayMessageSent: true })).toBe(false);
    });
});
