// src/services/leadService.ts
import toast from "react-hot-toast";
import API from "./api";
import { extractErrorMessage } from "../utils/errorUtils";

export type LeadStatus =
    | "novo"
    | "atendimento"
    | "convertido"
    | "perdido"
    | "em_andamento"
    | "lista_espera"
    | "pendencia_documentacao"
    | "sem_cobertura"
    | "virou_paciente"
    | "lead_quente"
    | "lead_frio";

export interface LeadFilters {
    search?: string;
    status?: LeadStatus;
    origin?: string;
    from?: string;   // ISO
    to?: string;     // ISO
    page?: number;
    limit?: number;
}

export interface CreateLeadFromSheetPayload {
    name: string;
    phone: string; // o back chama normalizeE164
    seekingFor?: "Adulto +18 anos" | "Infantil" | "Graduação";
    modality?: "Online" | "Presencial";
    healthPlan?: "Graduação" | "Mensalidade" | "Dependente";
    origin?: "WhatsApp" | "Site" | "Indicação" | "Outro" | "Tráfego pago" | "Google" | "Instagram" | "Meta Ads";
    scheduledDate?: string; // ISO
}

export interface HistoryMetrics {
    totalLeads: number;
    virouPaciente: number;
    engajado: number;
    pesquisandoPreco: number;
    primeiroContato: number;
    leadFrio: number;
    novo: number;
    taxaConversao: number;
}


export const leadService = {
    /** GET /leads — lista com filtros/paginação */
    async getLeads(filters: LeadFilters = {}) {
        try {
            const res = await API.get("/leads", { params: filters });
            // Aceita { data, total } ou array cru
            const payload = res.data?.data
                ? res.data
                : { data: Array.isArray(res.data) ? res.data : [], total: res.data?.total ?? (Array.isArray(res.data) ? res.data.length : 0) };

            return { success: true, data: payload.data, total: payload.total };
        } catch (error: any) {
            console.error("Erro ao buscar leads:", error);
            toast.error(extractErrorMessage(error, "Erro ao carregar leads."));
            return { success: false, error, data: [], total: 0 };
        }
    },

    /** POST /leads/from-sheet — cria/upserta e dispara manageLeadCircuit('initial') */
    async createLeadFromSheet(payload: CreateLeadFromSheetPayload) {
        try {
            const res = await API.post("/leads/from-sheet", payload);
            const data = res.data?.data ?? res.data;
            toast.success("Lead criado da planilha!");
            return { success: true, data };
        } catch (error: any) {
            console.error("Erro ao criar lead (from-sheet):", error);
            toast.error(extractErrorMessage(error, "Erro ao criar lead."));
            return { success: false, error };
        }
    },

    /** GET /leads/by-phone/:phone — gateway extensão Chrome ↔ CRM */
    async getByPhone(phone: string): Promise<{ found: boolean; lead: any | null; alternatives: any[] }> {
        try {
            const normalized = phone.replace(/\D/g, '');
            const res = await API.get(`/leads/by-phone/${normalized}`);
            return res.data;
        } catch {
            return { found: false, lead: null, alternatives: [] };
        }
    },

    /** POST /leads/novo-acompanhamento — sempre cria novo lead operacional (sem dedup) */
    async createNewFollowup(payload: {
        name: string;
        phone?: string;
        origin?: string;
        pipeline?: string;
        nextActionAt?: string | null;
        followupReason?: string;
        nextActionNote?: string;
    }) {
        try {
            const res = await API.post('/leads/novo-acompanhamento', payload);
            const data = res.data?.data ?? res.data;
            toast.success('Acompanhamento criado!');
            return { success: true, data };
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao criar acompanhamento.'));
            return { success: false, error };
        }
    },

    /** PATCH /leads/:id/status — atualiza status */
    async updateLeadStatus(leadId: string, status: LeadStatus) {
        try {
            const res = await API.patch(`/leads/${leadId}/status`, { status });
            const data = res.data?.data ?? res.data;
            toast.success("Status atualizado!");
            return { success: true, data };
        } catch (error: any) {
            console.error("Erro ao atualizar status do lead:", error);
            toast.error(extractErrorMessage(error, "Erro ao atualizar status."));
            return { success: false, error };
        }
    },

    /** POST /leads/:leadId/convert-to-patient */
    async convertLeadToPatient(leadId: string) {
        try {
            const res = await API.post(`/leads/${leadId}/convert-to-patient`);
            const data = res.data?.data ?? res.data;
            toast.success("Lead convertido para paciente!");
            return { success: true, data };
        } catch (error: any) {
            console.error("Erro ao converter lead:", error);
            toast.error(extractErrorMessage(error, "Erro ao converter lead."));
            return { success: false, error };
        }
    },

    /** GET /leads/sheet-metrics */
    async getSheetMetrics(params?: { startDate?: string; endDate?: string }) {
        try {
            const res = await API.get("/leads/sheet-metrics", { params });
            const data = res.data?.data ?? res.data;
            return { success: true, data };
        } catch (error: any) {
            console.error("Erro ao buscar métricas (sheet):", error);
            toast.error(extractErrorMessage(error, "Erro ao carregar métricas."));
            return { success: false, error };
        }
    },

    /** GET /leads/weekly-metrics */
    async getWeeklyMetrics(params: { year: string | number; month: string | number }) {
        try {
            const res = await API.get("/leads/weekly-metrics", { params });
            const data = res.data?.data ?? res.data;
            return { success: true, data };
        } catch (error: any) {
            console.error("Erro ao buscar métricas semanais:", error);
            toast.error(extractErrorMessage(error, "Erro ao carregar métricas semanais."));
            return { success: false, error };
        }
    },

    async getLeadById(leadId: string) {
        try {
            const res = await API.get(`/leads/${leadId}`);
            return { success: true, data: res.data.data };
        } catch (error: any) {
            toast.error("Erro ao buscar lead");
            return { success: false, error };
        }
    },

    async createLeadFromAd(payload: {
        name: string;
        phone: string;
        origin: string;
        adData?: any;
        metadata?: any;
    }) {
        try {
            const res = await API.post("/leads/from-ad", payload);
            toast.success("Lead de anúncio criado! Amanda 2.0 analisou.");
            return { success: true, data: res.data.data };
        } catch (error: any) {
            toast.error("Erro ao criar lead");
            return { success: false, error };
        }
    },
    /** GET /leads/operational-counts — badge global: atrasados + hoje */
    async getOperationalCounts(): Promise<{ overdue: number; today: number; total: number }> {
        try {
            const res = await API.get('/leads/operational-counts');
            return res.data;
        } catch {
            return { overdue: 0, today: 0, total: 0 };
        }
    },

    /** PUT /leads/:id — atualiza campos do bloco operational (dot-notation para não sobrescrever o subdocumento) */
    async updateOperational(leadId: string, fields: Record<string, any>) {
        const body: Record<string, any> = {};
        for (const [k, v] of Object.entries(fields)) {
            body[`operational.${k}`] = v;
        }
        try {
            const res = await API.put(`/leads/${leadId}`, body);
            const data = res.data?.data ?? res.data;
            return { success: true, data };
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao atualizar lead.'));
            return { success: false, error };
        }
    },

    /** GET /leads/history-metrics */
    async getHistoryMetrics() {
        try {
            const res = await API.get("/leads/history-metrics");
            const data = res.data?.data ?? res.data;
            return { success: true, data };
        } catch (error: any) {
            console.error("Erro ao buscar métricas históricas:", error);
            toast.error(extractErrorMessage(error, "Erro ao carregar métricas históricas."));
            return { success: false, error };
        }
    },

};

