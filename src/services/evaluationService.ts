// services/evaluationService.ts
import toast from "react-hot-toast";
import API from "./api";
import { extractErrorMessage } from "../utils/errorUtils";

export const createEvaluation = async (
  data: {
    patientId: string;
    doctorId: string;
    sessionType: string;
    paymentType: string;
    date: string;
    time: string;
  },
) => {
  try {
    const response = await API.post("/v2/evolutions", data);

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error("Erro ao criar avaliação:", error);

    toast.error(
      extractErrorMessage(error, "Erro ao criar avaliação.")
    );

    return {
      success: false,
      error,
    };
  }
};

export const updateEvaluation = async (id: string, data: any) => {
  try {
    const response = await API.put(`/v2/evolutions/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Erro ao atualizar avaliação:", error);
    throw error;
  }
};

export const getEvaluationsByPatient = async (patientId: string) => {
  const response = await API.get(`/v2/evolutions/patient/${patientId}`);

  return response.data;
};

export const deleteEvaluation = async (id: string) => {
  return API.delete(`/v2/evolutions/${id}`).then((res) => res.data);
};

export const getPatientProgress = (patientId: string) =>
  API.get(`/v2/evolutions/patient/${patientId}/progress`);

// protocolService.ts
export const getProtocols = (params?: { specialty?: string; active?: boolean }) =>
  API.get('/protocols', { params });

export const getProtocolAnalyticsUsage = (params?: { specialty?: string }) =>
  API.get('/protocols/analytics/usage', { params });

export const getProtocolEffectiveness = (code: string) =>
  API.get('/protocols/analytics/effectiveness', { params: { code } });