import API from './api';

export interface SuggestedSlot {
  date: string;
  time: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  score: number;
  reason: string;
  isPreferredTime: boolean;
  isPreferredDoctor: boolean;
}

export interface SuggestionParams {
  doctorId?: string;
  specialty?: string;
  patientId?: string;
  serviceType?: string;
  dateFrom?: string;
  dateTo?: string;
  maxResults?: number;
}

export const getAgendaSuggestions = async (params: SuggestionParams): Promise<SuggestedSlot[]> => {
  const response = await API.post('/v2/appointments/agenda/suggestions', params);
  return response.data?.data?.suggestions || [];
};
