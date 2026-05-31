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
    patient: { _id: string; fullName: string };
    total: number;
    attended: number;
    missed: number;
    canceled: number;
    pending: number;
    frequency: number;
    lastSession: string;
    // Campos opcionais — backend pode não retornar ainda (Fase 2 os traz sempre)
    nextAppointment?: { date: string; time?: string } | null;
    lastSessionType?: string;
}

export interface PatientRisk {
    patient: { _id: string; fullName: string };
    riskLevel: RiskLevel;
    reasons: string[];
    frequency: number;
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
    frequency: number
): RecommendedAction {
    if (riskLevel === 'low') return 'none';
    if (daysSinceLastSession > 14) return 'schedule_followup';
    if (missed >= 4) return 'send_reminder';
    if (frequency < 75) return 'review_evolution';
    return 'none';
}

export function derivePatientRisk(item: AttendanceSummary): PatientRisk {
    const reasons: string[] = [];

    const daysSinceLastSession = item.lastSession
        ? Math.floor((Date.now() - new Date(item.lastSession).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

    if (item.frequency < 60) reasons.push(`Frequência crítica (${item.frequency}%)`);
    else if (item.frequency < 75) reasons.push(`Frequência baixa (${item.frequency}%)`);

    if (item.missed >= 3) reasons.push(`${item.missed} faltas acumuladas`);

    if (daysSinceLastSession > 30) reasons.push(`${daysSinceLastSession} dias sem sessão`);
    else if (daysSinceLastSession > 14) reasons.push(`${daysSinceLastSession} dias sem sessão`);

    let riskLevel: RiskLevel = 'low';
    if (item.frequency < 60 || daysSinceLastSession > 30 || item.missed >= 4) {
        riskLevel = 'high';
    } else if (item.frequency < 75 || daysSinceLastSession > 14 || item.missed >= 3) {
        riskLevel = 'medium';
    }

    return {
        patient: item.patient,
        riskLevel,
        reasons,
        frequency: item.frequency,
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
            return order[a.riskLevel] - order[b.riskLevel];
        });
}
