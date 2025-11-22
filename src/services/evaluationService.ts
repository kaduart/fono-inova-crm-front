// services/evaluationService.ts
import toast from "react-hot-toast";
import API from "./api";

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
    const response = await API.post("evolutions/availables", data);

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error("Erro ao criar avaliação:", error);

    toast.error(
      error?.response?.data?.message || "Erro ao criar avaliação."
    );

    return {
      success: false,
      error,
    };
  }
};

export const updateEvaluation = async (id: string, data: any) => {
  try {
    const response = await API.put(`/evolutions/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Erro ao atualizar avaliação:", error);
    throw error;
  }
};

export const getEvaluationsByPatient = async (patientId: string) => {
  const response = await API.get(`/evolutions/patient/${patientId}`);

  return response.data;
};

export const deleteEvaluation = async (id: string) => {
  return API.delete(`/evolutions/${id}`).then((res) => res.data);
};

export const getPatientProgress = (patientId: string) =>
  API.get(`/evolutions/patient/${patientId}/progress`);

// protocolService.ts
export const getProtocols = (params?: { specialty?: string; active?: boolean }) =>
  API.get('/protocols', { params });

export const getProtocolAnalyticsUsage = (params?: { specialty?: string }) =>
  API.get('/protocols/analytics/usage', { params });

export const getProtocolEffectiveness = (code: string) =>
  API.get('/protocols/analytics/effectiveness', { params: { code } });