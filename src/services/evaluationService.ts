// services/evaluationService.ts
// ⚠️ LEGADO: Este service ainda é usado por PatientEvolution, PatientDashboard e ProgressDashboard.
// Foi atualizado para compatibilidade com DTO V2 (unwrap automático).

import toast from "react-hot-toast";
import API from "./api";
import { extractErrorMessage } from "../utils/errorUtils";
import { handleV2Response } from "../utils/dtoHelper";

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
    // 📝 V2 síncrono — retorna envelope { success, data, meta }
    const response = await API.post("/v2/evolutions", data);
    const evolution = await handleV2Response(response);

    return {
      success: true,
      data: evolution,
    };
  } catch (error: any) {
    console.error("Erro ao criar avaliação:", error);
    toast.error(extractErrorMessage(error, "Erro ao criar avaliação."));
    return { success: false, error };
  }
};

export const updateEvaluation = async (id: string, data: any) => {
  try {
    const response = await API.put(`/v2/evolutions/${id}`, data);
    return handleV2Response(response);
  } catch (error) {
    console.error("Erro ao atualizar avaliação:", error);
    throw error;
  }
};

export const getEvaluationsByPatient = async (patientId: string) => {
  const response = await API.get(`/v2/evolutions/patient/${patientId}`);
  return handleV2Response(response);
};

export const deleteEvaluation = async (id: string) => {
  const response = await API.delete(`/v2/evolutions/${id}`);
  return handleV2Response(response);
};

export const getPatientProgress = async (patientId: string) => {
  const response = await API.get(`/v2/evolutions/patient/${patientId}/progress`);
  return handleV2Response(response);
};

// protocolService.ts
export const getProtocols = (params?: { specialty?: string; active?: boolean }) =>
  API.get('/protocols', { params });

export const getProtocolAnalyticsUsage = (params?: { specialty?: string }) =>
  API.get('/protocols/analytics/usage', { params });

export const getProtocolEffectiveness = (code: string) =>
  API.get('/protocols/analytics/effectiveness', { params: { code } });
