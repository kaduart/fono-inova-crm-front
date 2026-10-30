import API from './api';

export interface PatientsWithoutNextSession {
  success: boolean;
  total: number;
  recurrent: number;
  impactMonthly: number;
  patients: Array<{
    patientId: string;
    name: string;
    phone: string;
    lastSessionDate: string;
    lastSessionTime: string;
    specialty: string;
    isRecurrent: boolean;
  }>;
}

export const operationalService = {
  getPatientsWithoutNextSession: async (date?: string): Promise<PatientsWithoutNextSession> => {
    const res = await API.get('/v2/operational/patients-without-next-session', { params: date ? { date } : undefined });
    return res.data;
  },
};
