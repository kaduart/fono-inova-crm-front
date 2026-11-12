// "Passou sem parabéns" só vale para aniversário a partir de 12/11/2026 (Kadu).
import { describe, expect, it } from 'vitest';
import { isLateBirthday } from '../BirthdayList';

describe('isLateBirthday', () => {
    const now = new Date(2026, 10, 14, 10); // sáb 14/11/2026
    it('aniversário antes de 12/11 não conta como atrasado', () => {
        expect(isLateBirthday({ daysUntil: -6 }, now)).toBe(false); // 08/11
    });
    it('aniversário de 12/11 em diante sem parabéns conta', () => {
        expect(isLateBirthday({ daysUntil: -2 }, now)).toBe(true); // 12/11
        expect(isLateBirthday({ daysUntil: -1 }, now)).toBe(true);
    });
    it('quem recebeu parabéns ou ainda não fez aniversário não conta', () => {
        expect(isLateBirthday({ daysUntil: -1, birthdayMessageSent: true }, now)).toBe(false);
        expect(isLateBirthday({ daysUntil: 0 }, now)).toBe(false);
    });
});
