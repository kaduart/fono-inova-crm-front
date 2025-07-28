import { ISession } from "../utils/types/types";
import API from "./api";

// services/sessionService.ts
export const getFutureSessions = async (patientId: string): Promise<ISession[]> => {
  try {
    const response = await API.get(`/payments/future-sessions/${patientId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching future sessions:', error);
    throw error;
  }
};