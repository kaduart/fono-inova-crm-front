// services/followupService.ts
import toast from "react-hot-toast";
import API from "./api";
import { extractErrorMessage } from "../utils/errorUtils";

export interface FollowupMetrics {
  sent: number;
  failed: number;
  scheduled: number;
  processing: number;
  responded: number;
  conversionRate: number;
  aiOptimized: number;
}

export interface TrendData {
  _id: string;
  sent: number;
  responded: number;
  failed: number;
}

export const followupService = {
  // ===== MÉTRICAS E ESTATÍSTICAS =====
  async getMetrics() {
    try {
      const response = await API.get("/followups/stats");
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Erro ao buscar métricas de followup:", error);
      toast.error(extractErrorMessage(error, "Erro ao carregar métricas."));
      return { success: false, error };
    }
  },

  async getTrend(days: number = 7) {
    try {
      const response = await API.get("/followups/trend", {
        params: { days }
      });
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Erro ao buscar tendência:", error);
      toast.error(extractErrorMessage(error, "Erro ao carregar tendência."));
      return { success: false, error };
    }
  },

  async getConversionByOrigin() {
    try {
      const response = await API.get("/followups/conversion-by-origin");
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Erro ao buscar conversão por origem:", error);
      toast.error(extractErrorMessage(error, "Erro ao carregar conversão por origem."));
      return { success: false, error };
    }
  },

  // ===== ROI POR ORIGEM (Lead → Patient → Revenue) =====
  async getRoiBySource(params?: { startDate?: string; endDate?: string; doctorId?: string }) {
    try {
      const response = await API.get("/v2/analytics/roi/roi-by-source", { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error("Erro ao buscar ROI por origem:", error);
      toast.error(extractErrorMessage(error, "Erro ao carregar ROI por origem."));
      return { success: false, error };
    }
  },

  // ===== LISTAGEM E FILTROS =====
  async listByLead(leadId: string) {
    try {
      const res = await API.get("/followups/filter", { params: { lead: leadId } });
      return { success: true, data: res.data.data || res.data || [] };
    } catch (error: any) {
      console.error("Erro ao carregar follow-ups:", error);
      toast.error(extractErrorMessage(error, "Erro ao carregar follow-ups."));
      return { success: false, error };
    }
  },

  async filter(params: Record<string, any>) {
    try {
      const res = await API.get("/followups/filter", { params });
      return { success: true, data: res.data.data || [] };
    } catch (error: any) {
      console.error("Erro ao filtrar follow-ups:", error);
      toast.error(extractErrorMessage(error, "Erro ao filtrar follow-ups."));
      return { success: false, error };
    }
  },

  // ✅ NOVO: Buscar pendentes
  async getPending() {
    try {
      const res = await API.get("/followups/pending");
      return { success: true, data: res.data.data || [] };
    } catch (error: any) {
      console.error("Erro ao buscar pendentes:", error);
      toast.error(extractErrorMessage(error, "Erro ao buscar pendentes."));
      return { success: false, error };
    }
  },

  // ✅ NOVO: Buscar histórico do lead
  async getHistory(leadId: string) {
    try {
      const res = await API.get(`/followups/history/${leadId}`);
      return { success: true, data: res.data.data || [] };
    } catch (error: any) {
      console.error("Erro ao buscar histórico:", error);
      toast.error(extractErrorMessage(error, "Erro ao buscar histórico."));
      return { success: false, error };
    }
  },

  // ===== CRIAÇÃO E ENVIO =====
  async create(payload: { lead: string; message: string; stage?: string }) {
    try {
      const res = await API.post("/followups", payload);
      toast.success("Follow-up criado com sucesso!");
      return { success: true, data: res.data.data };
    } catch (error: any) {
      console.error("Erro ao criar follow-up:", error);
      toast.error(extractErrorMessage(error, "Erro ao criar follow-up."));
      return { success: false, error };
    }
  },

  async resend(id: string) {
    try {
      const res = await API.post(`/followups/resend/${id}`);
      toast.success("Follow-up reenviado com sucesso!");
      return { success: true, data: res.data.data };
    } catch (error: any) {
      console.error("Erro ao reenviar follow-up:", error);
      toast.error(extractErrorMessage(error, "Erro ao reenviar follow-up."));
      return { success: false, error };
    }
  },

  // ✅ NOVO: Agendar follow-up
  async schedule(payload: {
    leadId: string;
    message?: string;
    scheduledAt: string;
    aiOptimized?: boolean;
  }) {
    try {
      const res = await API.post("/followups/schedule", payload);
      toast.success("Follow-up agendado com sucesso!");
      return { success: true, data: res.data.data };
    } catch (error: any) {
      console.error("Erro ao agendar follow-up:", error);
      toast.error(extractErrorMessage(error, "Erro ao agendar follow-up."));
      return { success: false, error };
    }
  },

  // ✅ NOVO: Criar follow-up com IA (Amanda 2.0)
  async createAIFollowup(payload: {
    leadId: string;
    context?: string;
    tone?: 'casual' | 'formal' | 'friendly';
    stage?: string;
  }) {
    try {
      const res = await API.post("/followups/ai-generate", payload);
      toast.success("Follow-up gerado com IA!");
      return { success: true, data: res.data.data };
    } catch (error: any) {
      console.error("Erro ao gerar follow-up com IA:", error);
      toast.error(extractErrorMessage(error, "Erro ao gerar follow-up com IA."));
      return { success: false, error };
    }
  },

};