import API from './api';

export interface WeeklySlot {
  time: string;
  available: boolean;
  professional: string;
  professionalId: string;
}

export interface WeeklyProfessional {
  professionalId: string;
  professionalName: string;
  specialty: string;
  slots: WeeklySlot[];
}

export interface WeeklyDay {
  date: string;
  dayOfWeek: string;
  dayLabel: string;
  professionals: WeeklyProfessional[];
  message?: string;
}

export interface WeeklyAvailabilityResponse {
  success: boolean;
  count: number;
  availability: WeeklyDay[];
}

export const weeklyAvailabilityService = {
  async fetch(params: { startDate: string; specialty: string; days?: number }) {
    const query = new URLSearchParams();
    query.append('startDate', params.startDate);
    query.append('specialty', params.specialty);
    if (params.days) query.append('days', String(params.days));
    
    const res = await API.get<WeeklyAvailabilityResponse>(`/v2/appointments/weekly-availability?${query.toString()}`);
    return res.data;
  }
};
