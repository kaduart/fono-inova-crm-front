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

export type ContactKind = 'reactivation' | 'renewal' | 'fit' | 'lead_reply';

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
    async registerContact(p: { targetType: 'patient' | 'lead'; targetId: string; kind: ContactKind; note?: string }) {
        return unwrap(await API.post('/v2/commercial/contacts', p));
    },
};
