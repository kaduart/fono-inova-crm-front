// services/leadService.ts
import toast from "react-hot-toast";
import API from "./api";

export const leadService = {
    async getLeads(filters: any = {}) {
        try {
            const response = await API.get("/leads", { params: filters });

            return {
                success: true,
                data: response.data,
            };
        } catch (error: any) {
            console.error("Erro ao buscar leads:", error);

            toast.error(
                error?.response?.data?.error || "Erro ao carregar leads."
            );

            return {
                success: false,
                error,
            };
        }
    },

    async createLead(data: {
        name: string;
        contact: {
            email?: string;
            phone: string;
        };
        origin: string;
        status?: string;
        appointment?: {
            seekingFor: string;
            modality: string;
            healthPlan: string;
        };
        notes?: string;
    }) {
        try {
            const response = await API.post("/leads/from-sheet", data);

            toast.success("Lead criado com sucesso!");

            return {
                success: true,
                data: response.data,
            };
        } catch (error: any) {
            console.error("Erro ao criar lead:", error);

            toast.error(
                error?.response?.data?.error || "Erro ao criar lead."
            );

            return {
                success: false,
                error,
            };
        }
    },

    async updateLeadStatus(id: string, status: string) {
        try {
            const response = await API.patch(`/leads/${id}/status`, { status });

            toast.success("Status atualizado!");

            return {
                success: true,
                data: response.data,
            };
        } catch (error: any) {
            console.error("Erro ao atualizar status do lead:", error);

            toast.error(
                error?.response?.data?.error || "Erro ao atualizar status."
            );

            return {
                success: false,
                error,
            };
        }
    },

    // ... outros métodos se necessário
};