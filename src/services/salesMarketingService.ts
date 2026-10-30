import API from './api';

/**
 * KPIs de Vendas & Marketing. Regras no back: docs/SALES_MARKETING.md.
 * Esta camada só tipa e repassa; o front não recalcula nenhum número.
 */

export interface LeadsSummary {
    period: { start: string; end: string; days: number };
    kpis: {
        newLeads: number; prevNewLeads: number;
        conversed: number; conversedRate: number;
        scheduled: number; scheduledRate: number;
        attended: number; pack: number; revenue: number;
    };
    funnel: { key: string; label: string; value: number }[];
}

export interface RoiChannel {
    key: string; label: string;
    spend: number; leads: number; patients: number; revenue: number;
    costPerLead: number | null; costPerPatient: number | null; returnMultiple: number | null;
    verdict: { tone: 'green' | 'amber' | 'red' | 'gray'; text: string };
}

export interface RoiSummary {
    period: { start: string; end: string; days: number };
    totals: Omit<RoiChannel, 'key' | 'label' | 'verdict'>;
    coverage: { leads: number; attributed: number; withOrigin: number; rate: number };
    channels: RoiChannel[];
}

const unwrap = <T>(res: any): T => (res?.data?.data ?? res?.data) as T;

export const salesMarketingService = {
    async leadsSummary(start: string, end: string) {
        return unwrap<LeadsSummary>(await API.get('/v2/commercial/leads-summary', { params: { start, end } }));
    },
    async roiSummary(start: string, end: string) {
        return unwrap<RoiSummary>(await API.get('/v2/commercial/roi-summary', { params: { start, end } }));
    },
};
