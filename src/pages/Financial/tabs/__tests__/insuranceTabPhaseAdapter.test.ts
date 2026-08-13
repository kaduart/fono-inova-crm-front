/**
 * Fase 4 — fatia por fase na aba Convênios.
 *
 * Trava a regra que evita dupla contagem visual: uma MESMA guia aparece em
 * várias abas (A Faturar / Faturados / Recebidos), mas cada aba mostra somente
 * a parcela daquela fase — nunca o total da guia.
 */

import { describe, it, expect } from 'vitest';
import {
    adaptGuideViewToPendingGuide,
    billedPaymentIdsFromSelectedGuides,
    buildOverdueGuidesList,
    usesGuideSelection
} from '../InsuranceTab';
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
    it('aceita summary sem sessionDetails e preserva datas e totais agregados', () => {
        const summary = { ...guiaMista, sessionDetails: undefined, firstSessionDate: '2026-06-01', lastSessionDate: '2026-08-05' };
        const adaptada = adaptGuideViewToPendingGuide(summary, 'pendingBilling');
        expect(adaptada.sessions).toEqual([]);
        expect(adaptada.pendingSessions).toBe(4);
        expect(adaptada.pendingValue).toBe(560);
        expect(adaptada.firstSessionDate).toBe('2026-06-01');
        expect(adaptada.lastSessionDate).toBe('2026-08-05');
    });

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

    it('Faturados mantém seleção visível; Recebidos continua somente leitura', () => {
        expect(usesGuideSelection(2)).toBe(true);
        expect(usesGuideSelection(3)).toBe(false);
    });

    it('guia faturada selecionada envia somente seus Payment IDs billed', () => {
        const guia = adaptGuideViewToPendingGuide({
            ...guiaMista,
            sessionDetails: [
                { sessionId: 's1', paymentId: 'pay-b1', date: '2026-06-01', time: null, doctorName: null, specialty: null, status: 'completed', phase: 'billed', value: 140, paymentStatus: 'billed', batchId: 'batch1', batchStatus: 'sent', competenceDate: '2026-06-10' },
                { sessionId: 's2', paymentId: 'pay-b2', date: '2026-06-02', time: null, doctorName: null, specialty: null, status: 'completed', phase: 'billed', value: 140, paymentStatus: 'billed', batchId: 'batch1', batchStatus: 'sent', competenceDate: '2026-06-10' }
            ]
        }, 'billed');

        expect(billedPaymentIdsFromSelectedGuides([guia], new Set(['g1'])))
            .toEqual(['pay-b1', 'pay-b2']);
        expect(billedPaymentIdsFromSelectedGuides([guia], new Set())).toEqual([]);
    });

    it('guia mista baixa somente billed; pending e received permanecem fora do command', () => {
        const guiaMistaAdaptada = adaptGuideViewToPendingGuide({
            ...guiaMista,
            sessionDetails: [
                { sessionId: 'sp', paymentId: 'pay-pending', date: '2026-08-01', time: null, doctorName: null, specialty: null, status: 'completed', phase: 'pendingBilling', value: 140, paymentStatus: 'pending_billing', batchId: null, batchStatus: null, competenceDate: '2026-08-01' },
                { sessionId: 'sb1', paymentId: 'pay-billed-1', date: '2026-06-01', time: null, doctorName: null, specialty: null, status: 'completed', phase: 'billed', value: 140, paymentStatus: 'billed', batchId: 'batch1', batchStatus: 'sent', competenceDate: '2026-06-10' },
                { sessionId: 'sb2', paymentId: 'pay-billed-2', date: '2026-06-02', time: null, doctorName: null, specialty: null, status: 'completed', phase: 'billed', value: 140, paymentStatus: 'billed', batchId: 'batch1', batchStatus: 'sent', competenceDate: '2026-06-10' },
                { sessionId: 'sr', paymentId: 'pay-received', date: '2026-05-01', time: null, doctorName: null, specialty: null, status: 'completed', phase: 'received', value: 140, paymentStatus: 'received', batchId: 'batch0', batchStatus: 'received', competenceDate: '2026-07-01' }
            ]
        }, 'billed');

        expect(billedPaymentIdsFromSelectedGuides([guiaMistaAdaptada], new Set(['g1'])))
            .toEqual(['pay-billed-1', 'pay-billed-2']);
    });
});
