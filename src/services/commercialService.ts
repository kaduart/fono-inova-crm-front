import API from './api';

/**
 * Filas comerciais (encaixe, pacote acabando, reativação, lead sem resposta).
 * Regras no back: docs/COMMERCIAL_QUEUES.md. Esta camada só tipa e repassa.
 */

export interface FitLead {
    leadId: string;
    name: string;
    phone: string;
    status: string;
    lastInteractionAt: string | null;
    lastContactAt: string | null;
}

export interface QueuePatient {
    patientId: string;
    name: string;
    phone: string;
    specialty: string | null;
    doctorId: string | null;
    doctorName: string | null;
    lastSessionAt: string | null;
    daysSince: number | null;
    lastContactAt: string | null;
}

export interface PackageEndingItem {
    patientId: string;
    packageId: string;
    name: string;
    phone: string;
    specialty: string | null;
    doctorName: string | null;
    remaining: number;
    totalSessions: number;
    nextSessionAt: string | null;
    nextSessionTime: string | null;
    lastContactAt: string | null;
}

export interface WaitingLead {
    leadId: string;
    name: string;
    phone: string;
    therapyArea: string | null;
    origin: string | null;
    status: string;
    waitingSince: string;
    waitingMinutes: number;
    lastMessage: string | null;
}

export interface EvaluationItem {
    patientId: string;
    appointmentId: string;
    name: string;
    phone: string;
    specialty: string | null;
    doctorName: string | null;
    evaluatedAt: string;
    daysSince: number;
    lastContactAt: string | null;
    lastContactNote: string | null;
}

export interface EvaluationQueue { items: EvaluationItem[]; total: number; potentialMonthly: number }

export type NextDayState = 'not_sent' | 'no_reply' | 'change_requested' | 'review_required' | 'no_phone';

export interface NextDayItem {
    appointmentId: string;
    patientId: string | null;
    name: string;
    phone: string;
    time: string;
    specialty: string | null;
    doctorName: string | null;
    status: string;
    state: NextDayState;
    sentAt: string | null;
    respondedAt: string | null;
    responseText: string | null;
    missed30: number;
}

export interface NextDayQueue { date: string | null; total: number; confirmed: number; items: NextDayItem[] }

export type ContactKind = 'reactivation' | 'renewal' | 'fit' | 'lead_reply' | 'evaluation' | 'evaluation_lost';

const unwrap = <T>(res: any): T => (res?.data?.data ?? res?.data) as T;

export const commercialService = {
    async fitCandidates(specialty: string) {
        const res = await API.get('/v2/commercial/fit-candidates', { params: { specialty } });
        const d = unwrap<{ leads?: FitLead[]; patients?: QueuePatient[] }>(res);
        return { leads: Array.isArray(d?.leads) ? d.leads : [], patients: Array.isArray(d?.patients) ? d.patients : [] };
    },
    async packageEnding() {
        const d = unwrap<{ items?: PackageEndingItem[] }>(await API.get('/v2/commercial/package-ending'));
        return Array.isArray(d?.items) ? d.items : [];
    },
    async reactivation() {
        const d = unwrap<{ items?: QueuePatient[] }>(await API.get('/v2/commercial/reactivation'));
        return Array.isArray(d?.items) ? d.items : [];
    },
    async leadsWaiting(hours = 2) {
        const d = unwrap<{ items?: WaitingLead[] }>(await API.get('/v2/commercial/leads-waiting', { params: { hours } }));
        return Array.isArray(d?.items) ? d.items : [];
    },
    async evaluationNoPackage(): Promise<EvaluationQueue> {
        const d = unwrap<Partial<EvaluationQueue>>(await API.get('/v2/commercial/evaluation-no-package'));
        const items = Array.isArray(d?.items) ? d.items : [];
        return { items, total: d?.total ?? items.length, potentialMonthly: d?.potentialMonthly ?? 0 };
    },
    async unconfirmedNextDay(): Promise<NextDayQueue> {
        const d = unwrap<Partial<NextDayQueue>>(await API.get('/v2/commercial/unconfirmed-next-day'));
        return { date: d?.date ?? null, total: d?.total ?? 0, confirmed: d?.confirmed ?? 0, items: Array.isArray(d?.items) ? d.items : [] };
    },
    async sendConfirmationReminders(date: string) {
        return unwrap<{ queued: number; skipped: number; failed: number; queuePaused: boolean }>(
            await API.post('/v2/commercial/confirmation-reminders', { date }),
        );
    },
    async confirmAttendance(appointmentId: string) {
        return unwrap(await API.patch(`/v2/appointments/${appointmentId}/attendance-confirmation`, { status: 'confirmed' }));
    },
    async registerContact(p: { targetType: 'patient' | 'lead'; targetId: string; kind: ContactKind; note?: string }) {
        return unwrap(await API.post('/v2/commercial/contacts', p));
    },
};
