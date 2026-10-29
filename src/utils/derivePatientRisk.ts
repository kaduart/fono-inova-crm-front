/**
 * derivePatientRisk — lógica de risco isolada do componente.
 *
 * Fase 1: derivada client-side a partir dos dados de attendance-summary.
 * Fase 2: substituída por patient_risk_metrics (backend) sem alterar a UI.
 */

export type RiskLevel = 'high' | 'medium' | 'low';

// Intenção da próxima ação clínica — consumível por automações, WhatsApp, IA.
export type RecommendedAction = 'schedule_followup' | 'send_reminder' | 'review_evolution' | 'none';

export interface AttendanceSummary {
    patient: { _id: string; fullName: string; phone?: string | null; legalGuardian?: string | null };
    total: number;
    attended: number;
    missed: number;
    canceled: number;
    pending: number;
    /** null = nenhuma sessão prevista até agora no período */
    frequency: number | null;
    lastSession: string | null;
    expected?: number;
    // Campos opcionais — backend pode não retornar ainda (Fase 2 os traz sempre)
    nextAppointment?: { date: string; time?: string } | null;
    lastSessionType?: string;
}

export interface PatientRisk {
    patient: { _id: string; fullName: string; phone?: string | null; legalGuardian?: string | null };
    riskLevel: RiskLevel;
    reasons: string[];
    /** motivos em forma de código, para os chips de filtro */
    flags: Array<'low_frequency' | 'missed' | 'no_session' | 'no_next'>;
    frequency: number | null;
    lastSession?: string | null;
    daysSinceLastSession: number;
    missed: number;
    recommendedAction: RecommendedAction;
    nextAppointment?: { date: string; time?: string } | null;
    lastSessionType?: string;
}

function deriveRecommendedAction(
    riskLevel: RiskLevel,
    daysSinceLastSession: number,
    missed: number,
    frequency: number | null
): RecommendedAction {
    if (riskLevel === 'low') return 'none';
    if (daysSinceLastSession > 14) return 'schedule_followup';
    if (missed >= 4) return 'send_reminder';
    if (frequency !== null && frequency < 75) return 'review_evolution';
    return 'none';
}

export function derivePatientRisk(item: AttendanceSummary): PatientRisk {
    const reasons: string[] = [];
    const flags: PatientRisk['flags'] = [];
    const freq = typeof item.frequency === 'number' ? item.frequency : null;

    const daysSinceLastSession = item.lastSession
        ? Math.floor((Date.now() - new Date(item.lastSession).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

    if (freq !== null && freq < 60) { reasons.push(`Frequência crítica (${freq}%)`); flags.push('low_frequency'); }
    else if (freq !== null && freq < 75) { reasons.push(`Frequência baixa (${freq}%)`); flags.push('low_frequency'); }

    if (item.missed >= 3) { reasons.push(`${item.missed} faltas no período`); flags.push('missed'); }

    if (daysSinceLastSession > 14 && daysSinceLastSession < 999) { reasons.push(`${daysSinceLastSession} dias sem sessão`); flags.push('no_session'); }

    // Sem próxima sessão só vira motivo quando o back informa (campo presente) e há outro sinal
    const knowsNext = item.nextAppointment !== undefined;
    if (knowsNext && !item.nextAppointment && reasons.length) { reasons.push('Sem próxima sessão'); flags.push('no_next'); }

    let riskLevel: RiskLevel = 'low';
    if ((freq !== null && freq < 60) || (daysSinceLastSession > 30 && daysSinceLastSession < 999) || item.missed >= 4) {
        riskLevel = 'high';
    } else if ((freq !== null && freq < 75) || (daysSinceLastSession > 14 && daysSinceLastSession < 999) || item.missed >= 3) {
        riskLevel = 'medium';
    }

    return {
        patient: item.patient,
        riskLevel,
        reasons,
        flags,
        frequency: freq,
        lastSession: item.lastSession,
        daysSinceLastSession,
        missed: item.missed,
        recommendedAction: deriveRecommendedAction(riskLevel, daysSinceLastSession, item.missed, item.frequency),
        nextAppointment: item.nextAppointment ?? null,
        lastSessionType: item.lastSessionType,
    };
}

export function deriveAllRisks(data: AttendanceSummary[]): PatientRisk[] {
    return data
        .map(derivePatientRisk)
        .filter(r => r.riskLevel !== 'low')
        .sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 };
            // risco; depois quem não tem próxima sessão; depois menor frequência
            return order[a.riskLevel] - order[b.riskLevel]
                || Number(!!a.nextAppointment) - Number(!!b.nextAppointment)
                || (a.frequency ?? 101) - (b.frequency ?? 101);
        });
}
