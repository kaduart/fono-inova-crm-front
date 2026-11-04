import { describe, expect, it } from 'vitest';
import { selectBillingSessions } from '../billingSessionSelection';

const s = (id: string, date: string, phase = 'pendingBilling') => ({ sessionId: id, date, phase });

describe('selectBillingSessions', () => {
    it('guia mensal com sessões só de outubro, filtro em novembro: prepara outubro (bug Joaquim 04/11)', () => {
        const guide = { billingMode: 'per_month', sessions: [s('a', '2026-10-06'), s('b', '2026-10-29')] };
        const result = selectBillingSessions([guide], 'pendingBilling', '2026-11');
        expect(result.billingCompetence).toBe('2026-10');
        expect(result.sessionIds).toEqual(['a', 'b']);
        expect(result.remainingCompetences).toEqual([]);
    });

    it('guia mensal com sessão no mês do filtro: mantém o mês do filtro e avisa as outras', () => {
        const guide = { billingMode: 'per_month', sessions: [s('a', '2026-10-06'), s('b', '2026-11-03')] };
        const result = selectBillingSessions([guide], 'pendingBilling', '2026-11');
        expect(result.billingCompetence).toBe('2026-11');
        expect(result.sessionIds).toEqual(['b']);
        expect(result.remainingCompetences).toEqual(['2026-10']);
    });

    it('sem sessão no mês do filtro e várias competências: pega a mais antiga', () => {
        const guide = { billingMode: 'per_month', sessions: [s('b', '2026-09-10'), s('a', '2026-08-01')] };
        const result = selectBillingSessions([guide], 'pendingBilling', '2026-11');
        expect(result.billingCompetence).toBe('2026-08');
        expect(result.sessionIds).toEqual(['a']);
        expect(result.remainingCompetences).toEqual(['2026-09']);
    });

    it('competência explícita (drawer mensal) vence', () => {
        const guide = { billingMode: 'per_month', sessions: [s('a', '2026-10-06'), s('b', '2026-11-03')] };
        const result = selectBillingSessions([guide], 'pendingBilling', '2026-11', '2026-10');
        expect(result.sessionIds).toEqual(['a']);
        expect(result.billingCompetence).toBe('2026-10');
    });

    it('guia por guia leva todas as sessões da fase, de qualquer data', () => {
        const guide = { billingMode: 'per_guide', sessions: [s('a', '2026-06-02'), s('b', '2026-07-17'), s('c', '2026-07-20', 'billed')] };
        const result = selectBillingSessions([guide], 'pendingBilling', '2026-11');
        expect(result.sessionIds).toEqual(['a', 'b']);
        expect(result.billingCompetence).toBe('2026-11');
    });
});
