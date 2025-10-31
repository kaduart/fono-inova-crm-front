// services/followupService.ts
import toast from "react-hot-toast";
import API from "./api";

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
  async getMetrics() {
    try {
      const response = await API.get("/followups/stats");

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Erro ao buscar métricas de followup:", error);

      toast.error(
        error?.response?.data?.error || "Erro ao carregar métricas."
      );

      return {
        success: false,
        error,
      };
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

      toast.error(
        error?.response?.data?.error || "Erro ao carregar tendência."
      );

      return {
        success: false,
        error,
      };
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

      toast.error(
        error?.response?.data?.error || "Erro ao carregar conversão por origem."
      );

      return {
        success: false,
        error,
      };
    }
  }
};