/**
 * Fase 4 — fatia por fase na aba Convênios.
 *
 * Trava a regra que evita dupla contagem visual: uma MESMA guia aparece em
 * várias abas (A Faturar / Faturados / Recebidos), mas cada aba mostra somente
 * a parcela daquela fase — nunca o total da guia.
 */

import { describe, it, expect } from 'vitest';
import { adaptGuideViewToPendingGuide, buildOverdueGuidesList } from '../InsuranceTab';
import type { InsuranceGuideView } from '../../../../services/paymentService';

// Caso do enunciado: 16 sessões — 4 a faturar (R$560), 8 faturadas (R$1.120), 4 recebidas (R$560)
const guiaMista: InsuranceGuideView = {
    guideId: 'g1',
    number: '16007195',
    insurance: 'unimed',
    specialty: 'fonoaudiologia',
    patient: { _id: 'p1', fullName: 'Paciente Teste' },
    guideStatus: 'active',
    expiresAt: null,
    closedAt: null,
    billingMode: 'per_month',
    totalSessions: 20,
    usedSessions: 16,
    remaining: 4,
    sessionValue: 140,
    totalAuthorizedValue: 2800,
    sessions: {
        total: 16,
        pendingBilling: 4,
        documentationSent: 0,
        billed: 8,
        received: 4,
        outOfCycle: 0
    },
    financialSummary: {
        pendingAmount: 560,
        documentationSentAmount: 0,
        billedAmount: 1120,
        receivedAmount: 560,
        totalAmount: 2240
    },
    competenceBreakdown: {
        referenceMonth: '2026-08',
        current: { value: 280, sessions: 2 },
        previous: { value: 280, sessions: 2, oldestCompetence: '2026-06' }
    },
    billingState: 'pending',
    hasMixedStates: true,
    documentationSentAt: null,
    documentationSentAtIsProxy: false,
    invoiceNumber: null,
    sessionDetails: []
};

describe('adaptGuideViewToPendingGuide — fatia por fase', () => {
    it('cada aba recebe somente a sua parcela', () => {
        expect(adaptGuideViewToPendingGuide(guiaMista, 'pendingBilling')).toMatchObject({
            pendingSessions: 4, pendingValue: 560
        });
        expect(adaptGuideViewToPendingGuide(guiaMista, 'billed')).toMatchObject({
            pendingSessions: 8, pendingValue: 1120
        });
        expect(adaptGuideViewToPendingGuide(guiaMista, 'received')).toMatchObject({
            pendingSessions: 4, pendingValue: 560
        });
    });

    it('ANTI-DUPLA-CONTAGEM: nenhuma aba exibe o total da guia', () => {
        const total = guiaMista.financialSummary.totalAmount; // 2240
        for (const phase of ['pendingBilling', 'documentationSent', 'billed', 'received'] as const) {
            expect(adaptGuideViewToPendingGuide(guiaMista, phase).pendingValue).not.toBe(total);
        }
    });

    it('somar as 4 abas reproduz o total exatamente uma vez', () => {
        const soma = (['pendingBilling', 'documentationSent', 'billed', 'received'] as const)
            .reduce((acc, phase) => acc + adaptGuideViewToPendingGuide(guiaMista, phase).pendingValue, 0);
        expect(soma).toBe(guiaMista.financialSummary.totalAmount);

        const somaSessoes = (['pendingBilling', 'documentationSent', 'billed', 'received'] as const)
            .reduce((acc, phase) => acc + adaptGuideViewToPendingGuide(guiaMista, phase).pendingSessions, 0);
        expect(somaSessoes).toBe(guiaMista.sessions.total);
    });

    it('a guia mista preserva os contadores completos para a UI mostrar a composição', () => {
        const adaptada = adaptGuideViewToPendingGuide(guiaMista, 'billed');
        expect(adaptada.hasMixedStates).toBe(true);
        expect(adaptada.phaseCounters).toMatchObject({ pendingBilling: 4, billed: 8, received: 4 });
        // o rótulo diz "pending" (próxima ação), mas as 8 faturadas seguem visíveis
        expect(adaptada.billingState).toBe('pending');
    });

    it('sem fase (compat): agrega pendência + documentação enviada', () => {
        const adaptada = adaptGuideViewToPendingGuide(guiaMista);
        expect(adaptada.pendingSessions).toBe(4);
        expect(adaptada.pendingValue).toBe(560);
    });

    it('guia sem sessão na fase vira zero, não NaN', () => {
        const adaptada = adaptGuideViewToPendingGuide(guiaMista, 'documentationSent');
        expect(adaptada.pendingSessions).toBe(0);
        expect(adaptada.pendingValue).toBe(0);
    });

    it('preserva o breakdown do backend sem reconstruir competência', () => {
        expect(adaptGuideViewToPendingGuide(guiaMista, 'pendingBilling').competenceBreakdown)
            .toEqual(guiaMista.competenceBreakdown);
    });

    it('destaca atraso pelo breakdown do backend, sem reinterpretar datas', () => {
        const adaptada = adaptGuideViewToPendingGuide({
            ...guiaMista,
            // Datas atuais de propósito: se o frontend recalculasse, daria zero.
            sessionDetails: [{
                sessionId: 's1', date: '2026-08-05', time: null, doctorName: null,
                specialty: null, status: 'completed', phase: 'pendingBilling', value: 560,
                paymentId: null, paymentStatus: null, batchId: null, batchStatus: null,
                competenceDate: '2026-08-05'
            }]
        }, 'pendingBilling');

        expect(buildOverdueGuidesList([adaptada])).toEqual([expect.objectContaining({
            guideId: 'g1', overdueValue: 280, overdueCount: 2,
            oldestCompetence: '2026-06'
        })]);
    });
});
