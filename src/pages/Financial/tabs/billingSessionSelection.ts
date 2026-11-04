// Escolhe quais sessões entram no preparo de faturamento (BillingSubmission).
//
// Bug 04/11/2026: guia MENSAL esgotada (sessões de outubro) dentro de um
// paciente que também tem guias POR GUIA. O drawer cai no modo "por guia"
// (o modo decide pela 1ª guia) e não manda competência; o preparo usava o mês
// do filtro da tela (novembro) e descartava todas as sessões de outubro.
// Resultado: "8 sessões para faturar" na lista e "Nenhuma sessão pendente"
// no botão. Agora, sem competência explícita, a competência vem das próprias
// sessões: a mais antiga com pendência (1 lote por competência, regra do
// convênio). As demais competências ficam para o próximo preparo.

export interface BillingSessionLike {
    sessionId: string;
    date?: string | Date | null;
    phase?: string | null;
}

export interface BillingGuideLike {
    billingMode?: string | null;
    sessions?: BillingSessionLike[] | null;
}

export interface BillingSessionSelection {
    sessionIds: string[];
    billingCompetence: string;
    /** Outras competências com sessões pendentes que ficaram fora deste preparo. */
    remainingCompetences: string[];
}

const competenceOf = (date?: string | Date | null) => {
    const value = date instanceof Date ? date.toISOString().slice(0, 7) : String(date || '').slice(0, 7);
    return /^\d{4}-\d{2}$/.test(value) ? value : null;
};

export function selectBillingSessions(
    guides: BillingGuideLike[],
    expectedPhase: string,
    fallbackCompetence: string,
    competenceOverride?: string,
): BillingSessionSelection {
    const isMonthlyBilling = guides.length > 0 && guides.every(guide => guide.billingMode === 'per_month');
    const phaseSessions = guides.flatMap(guide => (guide.sessions || []).filter(session => session.phase === expectedPhase));
    const unique = (ids: string[]) => [...new Set(ids)];

    // POR GUIA (ou mistura): a guia acumula sessões de qualquer data até ser faturada.
    if (!isMonthlyBilling) {
        return {
            sessionIds: unique(phaseSessions.map(session => session.sessionId)),
            billingCompetence: competenceOverride || fallbackCompetence,
            remainingCompetences: [],
        };
    }

    const competences = [...new Set(phaseSessions.map(session => competenceOf(session.date)).filter((c): c is string => !!c))].sort();
    const billingCompetence = competenceOverride
        || (competences.includes(fallbackCompetence) ? fallbackCompetence : competences[0])
        || fallbackCompetence;

    return {
        sessionIds: unique(phaseSessions
            .filter(session => competenceOf(session.date) === billingCompetence)
            .map(session => session.sessionId)),
        billingCompetence,
        remainingCompetences: competences.filter(c => c !== billingCompetence),
    };
}
